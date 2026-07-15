/**
 * Portfolio command — main entry point for the Portfolio Tracker extension.
 *
 * This is a thin wiring layer that connects:
 * - `usePortfolio` hook (CRUD operations on accounts/positions via LocalStorage)
 * - `usePortfolioValue` hook (live price fetching, FX conversion, valuation)
 * - `PortfolioList` component (the main UI)
 * - Navigation targets (AccountForm, EditPositionForm, AddUnitsForm, search flow)
 *
 * It also updates the Raycast command metadata subtitle with the total portfolio
 * value so it's visible in the Raycast search bar at all times.
 *
 * Design principle: this file should contain NO rendering logic or business logic.
 * It only wires hooks to components and handles navigation pushes.
 */

import React from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigation, updateCommandMetadata, showToast, Toast, LocalStorage } from "@raycast/api";
import { usePortfolio } from "./hooks/usePortfolio";
import { usePortfolioValue } from "./hooks/usePortfolioValue";
import { PortfolioList } from "./components/PortfolioList";
import { ImportExportView } from "./components/ImportExportView";
import { AccountForm } from "./components/AccountForm";
import { EditPositionForm } from "./components/EditPositionForm";
import { AddUnitsForm } from "./components/AddUnitsForm";
import { AddCashForm } from "./components/AddCashForm";
import { AddMortgageForm } from "./components/AddMortgageForm";
import { EditMortgageForm } from "./components/EditMortgageForm";
import { MortgageCalculationsDetail } from "./components/MortgageCalculationsDetail";
import { AddDebtForm } from "./components/AddDebtForm";
import { EditDebtForm } from "./components/EditDebtForm";
import { SearchInvestmentsView } from "./components/SearchInvestmentsView";
import { SearchInvestmentsFlow } from "./components/SearchInvestmentsFlow";
import { BatchRenameMatch } from "./components/BatchRenameForm";
import { Account, Position, AccountType, isPropertyAssetType, isDebtAssetType } from "./utils/types";
import { formatCurrency, formatCurrencyCompact } from "./utils/formatting";
import { clearPriceCache } from "./services/price-cache";
import { SAMPLE_ACCOUNTS, isSampleAccount } from "./utils/sample-portfolio";
import { STORAGE_KEYS } from "./utils/constants";

// ──────────────────────────────────────────
// Command Component
// ──────────────────────────────────────────

export default function PortfolioCommand(): React.JSX.Element {
  const { push, pop } = useNavigation();

  // ── Data Hooks ──

  const {
    portfolio,
    isLoading: isPortfolioLoading,
    revalidate: revalidatePortfolio,
    addAccount,
    updateAccount,
    removeAccount,
    addPosition,
    updatePosition,
    updatePropertyPosition,
    updateDebtPosition,
    archiveDebtPosition,
    renamePosition,
    restorePositionName,
    batchRenamePositions,
    removePosition,
    mergeAccounts,
  } = usePortfolio();

  const {
    valuation,
    isLoading: isValuationLoading,
    errors,
    baseCurrency,
    refresh: refreshPrices,
    newlyPaidOffIds,
    clearNewlyPaidOff,
  } = usePortfolioValue(portfolio);

  const isLoading = isPortfolioLoading || isValuationLoading;

  // ── Archived Debt Toggle State ──
  const [showArchivedDebt, setShowArchivedDebt] = useState(false);

  // ── Auto-load sample portfolio on first launch ──
  // When the portfolio finishes loading for the first time and contains no
  // accounts AND the user hasn't previously dismissed the sample, automatically
  // merge the sample data so new users see a realistic demo immediately.
  // The ref ensures this only fires once per session.
  const didAutoLoadSample = useRef(false);

  useEffect(() => {
    if (didAutoLoadSample.current) return;
    if (isPortfolioLoading) return; // wait for initial load to finish
    if (!portfolio) return;
    if (portfolio.accounts.length > 0) return; // user already has data

    didAutoLoadSample.current = true;

    (async () => {
      try {
        // Check whether the user previously dismissed the sample portfolio.
        // If so, don't auto-load it again — respect their choice.
        const dismissed = await LocalStorage.getItem<string>(STORAGE_KEYS.SAMPLE_DISMISSED);
        if (dismissed === "true") return;

        await mergeAccounts(SAMPLE_ACCOUNTS);
        await showToast({
          style: Toast.Style.Success,
          title: "Sample Portfolio Loaded",
          message: "Select the banner and press Enter to hide it when you're ready.",
        });
      } catch (error) {
        console.error("Failed to auto-load sample portfolio:", error);
      }
    })();
  }, [isPortfolioLoading, portfolio, mergeAccounts]);

  // ── Auto-persist paid-off flag when sync detects a fully-repaid debt ──
  // When the repayment sync calculates that a debt's balance has reached zero,
  // it signals this via `newlyPaidOffIds`. We write `paidOff: true` back to
  // the portfolio positions so the UI reflects the settled state on next render.
  useEffect(() => {
    if (!portfolio || newlyPaidOffIds.size === 0) return;

    const idsToMark = new Set(newlyPaidOffIds);
    clearNewlyPaidOff();

    (async () => {
      for (const account of portfolio.accounts) {
        for (const position of account.positions) {
          if (!idsToMark.has(position.id) || !position.debtData) continue;
          await updateDebtPosition(account.id, position.id, {
            debtData: { ...position.debtData, paidOff: true },
          });
        }
      }
      revalidatePortfolio();
      await showToast({
        style: Toast.Style.Success,
        title: "Debt Paid Off 🎉",
        message:
          idsToMark.size === 1
            ? "A debt has been automatically marked as paid off."
            : `${idsToMark.size} debts have been automatically marked as paid off.`,
      });
    })();
  }, [newlyPaidOffIds, clearNewlyPaidOff, portfolio, updateDebtPosition, revalidatePortfolio]);

  // ── Update Command Metadata ──
  // This sets the grey subtitle text visible in Raycast's search bar
  // next to the "Portfolio Tracker" command name.

  useEffect(() => {
    if (valuation && valuation.totalValue > 0) {
      const subtitle = formatCurrencyCompact(valuation.totalValue, valuation.baseCurrency);
      updateCommandMetadata({ subtitle });
    } else if (valuation && valuation.accounts.length > 0) {
      updateCommandMetadata({ subtitle: formatCurrency(0, baseCurrency) });
    } else if (valuation && valuation.accounts.length === 0) {
      // Portfolio is empty (e.g. after removing sample data) — clear the subtitle
      // so Raycast's search bar doesn't show a stale total.
      updateCommandMetadata({ subtitle: "" });
    }
  }, [valuation, baseCurrency]);

  // ── Navigation Handlers ──

  function handleAddAccount(): void {
    push(
      <AccountForm
        onSubmit={async (name: string, type: AccountType) => {
          await addAccount(name, type);
        }}
      />,
    );
  }

  function handleEditAccount(account: Account): void {
    push(
      <AccountForm
        account={account}
        onSubmit={async (name: string, type: AccountType) => {
          await updateAccount(account.id, { name, type });
        }}
      />,
    );
  }

  async function handleDeleteAccount(accountId: string): Promise<void> {
    await removeAccount(accountId);
  }

  function handleAddPosition(accountId: string): void {
    const account = portfolio?.accounts.find((a) => a.id === accountId);
    const accountName = account?.name ?? "Account";

    push(
      <SearchInvestmentsView
        accountId={accountId}
        accountName={accountName}
        onConfirm={async (params) => {
          await addPosition(accountId, params);
        }}
      />,
    );
  }

  /**
   * Finds all positions across the portfolio that share the same original
   * Yahoo Finance name, excluding a specific position (the one just renamed).
   */
  function findMatchingPositions(originalName: string, excludePositionId: string): BatchRenameMatch[] {
    if (!portfolio) return [];
    const matches: BatchRenameMatch[] = [];

    for (const acct of portfolio.accounts) {
      for (const pos of acct.positions) {
        if (pos.id !== excludePositionId && pos.name === originalName) {
          matches.push({
            accountId: acct.id,
            accountName: acct.name,
            position: pos,
          });
        }
      }
    }

    return matches;
  }

  function handleEditPosition(account: Account, position: Position): void {
    push(
      <EditPositionForm
        position={position}
        accountId={account.id}
        accountName={account.name}
        onSave={async (updates) => {
          // ── 1. Save changes to the ORIGINAL asset ──
          if (updates.unitsChanged) {
            await updatePosition(account.id, position.id, updates.units);
          }

          let didRename = false;
          if (updates.nameChanged) {
            if (updates.customName) {
              await renamePosition(account.id, position.id, updates.customName);
              didRename = true;
            } else {
              await restorePositionName(account.id, position.id);
            }
          }

          // ── 2. Return batch candidates (component handles phase transition) ──
          if (didRename && updates.customName) {
            return findMatchingPositions(position.name, position.id);
          }

          return [];
        }}
        onBatchApply={async (renames) => {
          await batchRenamePositions(renames);
        }}
        onRestoreName={async () => {
          await restorePositionName(account.id, position.id);
        }}
        onDone={() => {
          pop();
          revalidatePortfolio();
        }}
      />,
    );
  }

  function handleAddUnits(account: Account, position: Position): void {
    push(
      <AddUnitsForm
        position={position}
        accountId={account.id}
        accountName={account.name}
        onSubmit={async (newTotalUnits: number) => {
          await updatePosition(account.id, position.id, newTotalUnits);
        }}
      />,
    );
  }

  function handleAddCash(accountId: string): void {
    const account = portfolio?.accounts.find((a) => a.id === accountId);
    const accountName = account?.name ?? "Account";

    push(
      <AddCashForm
        accountId={accountId}
        accountName={accountName}
        onConfirm={async (params) => {
          await addPosition(accountId, params);
        }}
      />,
    );
  }

  function handleAddProperty(accountId: string): void {
    const account = portfolio?.accounts.find((a) => a.id === accountId);
    const accountName = account?.name ?? "Account";

    push(
      <AddMortgageForm
        accountId={accountId}
        accountName={accountName}
        baseCurrency={baseCurrency}
        onConfirm={async (params) => {
          await addPosition(accountId, params);
        }}
      />,
    );
  }

  function handleAddDebt(accountId: string): void {
    const account = portfolio?.accounts.find((a) => a.id === accountId);
    const accountName = account?.name ?? "Account";

    push(
      <AddDebtForm
        accountId={accountId}
        accountName={accountName}
        baseCurrency={baseCurrency}
        onConfirm={async (params) => {
          await addPosition(accountId, params);
        }}
      />,
    );
  }

  function handleEditDebtPosition(account: Account, position: Position): void {
    if (!isDebtAssetType(position.assetType)) return;

    // Look up the live synced balance from the current valuation so EditDebtForm
    // pre-populates with the actual post-repayment balance rather than the stale
    // original value stored in debtData.currentBalance.
    const syncedBalance = valuation?.accounts
      .find((av) => av.account.id === account.id)
      ?.positions.find((pv) => pv.position.id === position.id)?.currentPrice;

    push(
      <EditDebtForm
        position={position}
        accountId={account.id}
        accountName={account.name}
        baseCurrency={baseCurrency}
        syncedBalance={syncedBalance}
        onSave={async (updates) => {
          await updateDebtPosition(account.id, position.id, updates);
        }}
        onDone={() => {
          pop();
          revalidatePortfolio();
        }}
      />,
    );
  }

  async function handleArchiveDebt(accountId: string, positionId: string): Promise<void> {
    await archiveDebtPosition(accountId, positionId);
  }

  function handleToggleArchivedDebt(): void {
    setShowArchivedDebt((prev) => !prev);
  }

  function handleShowCalculations(position: Position, hpiChangePercent: number): void {
    if (!isPropertyAssetType(position.assetType)) return;

    push(
      <MortgageCalculationsDetail
        position={position}
        hpiChangePercent={hpiChangePercent}
        baseCurrency={baseCurrency}
        onDone={() => pop()}
      />,
    );
  }

  function handleEditPropertyPosition(account: Account, position: Position): void {
    if (!isPropertyAssetType(position.assetType)) return;

    push(
      <EditMortgageForm
        position={position}
        accountId={account.id}
        accountName={account.name}
        baseCurrency={baseCurrency}
        onSave={async (updates) => {
          await updatePropertyPosition(account.id, position.id, updates);
        }}
        onDone={() => {
          pop();
          revalidatePortfolio();
        }}
      />,
    );
  }

  async function handleDeletePosition(accountId: string, positionId: string): Promise<void> {
    await removePosition(accountId, positionId);
  }

  function handleRefresh(): void {
    clearPriceCache();
    refreshPrices();
  }

  function handleImportExport(): void {
    push(
      <ImportExportView
        portfolio={portfolio}
        valuation={valuation}
        baseCurrency={baseCurrency}
        isLoading={isLoading}
        onMergeAccounts={async (accounts) => {
          await mergeAccounts(accounts);
        }}
        onRevalidate={() => {
          revalidatePortfolio();
          refreshPrices();
        }}
      />,
    );
  }

  function handleSearchInvestments(): void {
    // Use the full SearchInvestmentsFlow: search first, then pick an account,
    // then confirm details — no account is assumed up front.
    push(
      <SearchInvestmentsFlow
        onDone={() => {
          pop();
          revalidatePortfolio();
        }}
      />,
    );
  }

  // ── Sample Portfolio Handlers ──

  async function handleLoadSample(): Promise<void> {
    try {
      // Merge the pre-built sample accounts (with their sample- prefixed IDs)
      // directly into the portfolio so isSampleAccount() detection works.
      await mergeAccounts(SAMPLE_ACCOUNTS);

      await showToast({
        style: Toast.Style.Success,
        title: "Sample Portfolio Loaded",
        message: "Explore the demo data, then hide it when you're ready.",
      });
    } catch (error) {
      console.error("Failed to load sample portfolio:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Sample",
        message: String(error),
      });
    }
  }

  async function handleRemoveSample(): Promise<void> {
    try {
      const accounts = portfolio?.accounts ?? [];
      const sampleAccountIds = accounts.filter((a) => isSampleAccount(a.id)).map((a) => a.id);

      for (const accountId of sampleAccountIds) {
        await removeAccount(accountId);
      }

      // Persist the dismissal flag so the sample is never auto-loaded again.
      await LocalStorage.setItem(STORAGE_KEYS.SAMPLE_DISMISSED, "true");

      // Force revalidation so the hook picks up the updated storage state.
      // Without this, the portfolio closure may still reference stale data
      // and the valuation (+ command metadata subtitle) won't update.
      revalidatePortfolio();
      refreshPrices();

      // If removing samples leaves the portfolio empty, clear the subtitle
      // immediately rather than waiting for the valuation effect to fire.
      const remainingAccounts = accounts.filter((a) => !isSampleAccount(a.id));
      if (remainingAccounts.length === 0 || remainingAccounts.every((a) => a.positions.length === 0)) {
        updateCommandMetadata({ subtitle: "" });
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Sample Portfolio Removed",
      });
    } catch (error) {
      console.error("Failed to remove sample portfolio:", error);
    }
  }

  // ── Render ──

  return (
    <PortfolioList
      portfolio={portfolio}
      valuation={valuation}
      isLoading={isLoading}
      errors={errors}
      onAddAccount={handleAddAccount}
      onEditAccount={handleEditAccount}
      onDeleteAccount={handleDeleteAccount}
      onAddPosition={handleAddPosition}
      onAddCash={handleAddCash}
      onAddProperty={handleAddProperty}
      onAddDebt={handleAddDebt}
      onEditDebtPosition={handleEditDebtPosition}
      onArchiveDebt={handleArchiveDebt}
      showArchivedDebt={showArchivedDebt}
      onToggleArchivedDebt={handleToggleArchivedDebt}
      onEditPropertyPosition={handleEditPropertyPosition}
      onShowCalculations={handleShowCalculations}
      onEditPosition={handleEditPosition}
      onAddUnits={handleAddUnits}
      onDeletePosition={handleDeletePosition}
      onRefresh={handleRefresh}
      onImportExport={handleImportExport}
      onSearchInvestments={(portfolio?.accounts.length ?? 0) > 0 ? handleSearchInvestments : undefined}
      onLoadSample={handleLoadSample}
      onRemoveSample={handleRemoveSample}
    />
  );
}
