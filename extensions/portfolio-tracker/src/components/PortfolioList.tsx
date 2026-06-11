/**
 * PortfolioList component.
 *
 * The main portfolio overview view that composes accounts, positions, and actions
 * into a single Raycast List. This is the primary view users see when they open
 * the "Portfolio Tracker" command.
 *
 * Structure:
 * - A `List` with configurable `isShowingDetail` (toggled via ⌘D)
 * - Sort dropdown in the search bar accessory (Value ↓/↑, Change ↓/↑)
 * - One `List.Section` per account with coloured type tag and total in subtitle
 * - Each position rendered as a `PositionListItem` within its account section
 * - Account summary row pinned to the bottom of each section
 * - Empty state handled by `EmptyPortfolio` component (with sample portfolio)
 * - Sample portfolio banner with "Hide Sample" action (no confirmation)
 * - All actions composed in a layered ActionPanel:
 *     1. PositionActions (when a position is selected)
 *     2. AccountActions (for the parent account of the selected position)
 *     3. PortfolioActions (always available)
 *
 * Data flow:
 * - Receives portfolio data from `usePortfolio` hook (passed as props)
 * - Receives valuation data from `usePortfolioValue` hook (passed as props)
 * - Delegates all mutations back to the parent via callbacks
 * - Does NOT call hooks directly — purely a rendering component
 */

import React, { useState, useMemo } from "react";
import { ActionPanel, Action, Icon, List } from "@raycast/api";
import {
  Portfolio,
  PortfolioValuation,
  AccountValuation,
  PositionValuation,
  Account,
  Position,
  PortfolioError,
  ErrorType,
  SortField,
  SortDirection,
  isPropertyAssetType,
  isDebtAssetType,
} from "../utils/types";
import { formatCurrency, formatCurrencyCompact, formatRelativeTime, getDisplayName } from "../utils/formatting";
import { isDebtAccountType } from "../utils/types";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_COLORS,
  SORT_OPTIONS,
  DEFAULT_SORT_KEY,
  COLOR_PRIMARY,
  COLOR_WARNING,
  COLOR_DESTRUCTIVE,
  COLOR_NEUTRAL,
  COLOR_POSITIVE,
  COLOR_NEGATIVE,
} from "../utils/constants";
import { hasSampleAccounts } from "../utils/sample-portfolio";

import { EmptyPortfolio } from "./EmptyPortfolio";
import { PositionListItem } from "./PositionListItem";
import { PortfolioActions } from "./actions/PortfolioActions";
import { AccountActions } from "./actions/AccountActions";
import { PositionActions } from "./actions/PositionActions";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

export interface PortfolioListProps {
  /** The current portfolio state */
  portfolio: Portfolio | undefined;

  /** The computed portfolio valuation (prices + FX applied) */
  valuation: PortfolioValuation | undefined;

  /** Whether data is currently loading (prices, FX, or portfolio) */
  isLoading: boolean;

  /** Array of errors from price/FX fetching */
  errors: PortfolioError[];

  // ── Callbacks (mutations delegated to the parent) ──

  /** Navigate to the "Add Account" form */
  onAddAccount: () => void;

  /** Navigate to the "Edit Account" form for a specific account */
  onEditAccount: (account: Account) => void;

  /** Delete an account (parent handles confirmation if needed) */
  onDeleteAccount: (accountId: string) => Promise<void>;

  /** Navigate to the "Search Investments" / "Add Position" flow for an account */
  onAddPosition: (accountId: string) => void;

  /** Navigate to the "Add Cash" form for an account */
  onAddCash: (accountId: string) => void;

  /** Navigate to the "Add Property" form for a Property account */
  onAddProperty: (accountId: string) => void;

  /** Navigate to the "Add Debt" form for a Debt account */
  onAddDebt: (accountId: string) => void;

  /** Navigate to the "Edit Debt" form for a debt position */
  onEditDebtPosition: (account: Account, position: Position) => void;

  /** Archive/unarchive a debt position */
  onArchiveDebt: (accountId: string, positionId: string) => Promise<void>;

  /** Whether archived debt positions are currently visible */
  showArchivedDebt: boolean;

  /** Toggle visibility of archived debt positions */
  onToggleArchivedDebt: () => void;

  /** Navigate to the "Edit Property" form for a MORTGAGE/OWNED_PROPERTY position */
  onEditPropertyPosition: (account: Account, position: Position) => void;

  /** Show the full calculation breakdown for a property position */
  onShowCalculations: (position: Position, hpiChangePercent: number) => void;

  /** Navigate to the "Edit Position" form for a specific position */
  onEditPosition: (account: Account, position: Position) => void;

  /** Navigate to the "Add Units" form for a specific position */
  onAddUnits: (account: Account, position: Position) => void;

  /** Delete a position (parent handles confirmation if needed) */
  onDeletePosition: (accountId: string, positionId: string) => Promise<void>;

  /** Refresh all prices and FX rates */
  onRefresh: () => void;

  /** Navigate to the Import/Export view for CSV backup and restore */
  onImportExport?: () => void;

  /** Navigate to the standalone "Search Investments" command */
  onSearchInvestments?: () => void;

  /** Load the sample portfolio into storage */
  onLoadSample: () => void;

  /** Remove all sample accounts from the portfolio (no confirmation) */
  onRemoveSample: () => void;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function PortfolioList({
  portfolio,
  valuation,
  isLoading,
  errors,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onAddPosition,
  onAddCash,
  onAddProperty,
  onAddDebt,
  onEditDebtPosition,
  onArchiveDebt,
  showArchivedDebt,
  onToggleArchivedDebt,
  onEditPropertyPosition,
  onShowCalculations,
  onEditPosition,
  onAddUnits,
  onDeletePosition,
  onRefresh,
  onImportExport,
  onSearchInvestments,
  onLoadSample,
  onRemoveSample,
}: PortfolioListProps): React.JSX.Element {
  // ── Local UI State ──

  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [sortKey, setSortKey] = useState(DEFAULT_SORT_KEY);

  // ── Derived State ──

  const hasAccounts = (portfolio?.accounts.length ?? 0) > 0;
  const hasPositions = portfolio?.accounts.some((a) => a.positions.length > 0) ?? false;
  const showSampleBanner = hasAccounts && hasSampleAccounts(portfolio?.accounts ?? []);

  // Check if there are any archived debt positions (for the toggle action)
  const hasArchivedDebt =
    portfolio?.accounts.some((a) =>
      a.positions.some((p) => isDebtAssetType(p.assetType) && p.debtData?.archived === true),
    ) ?? false;

  // Resolve the current sort option from the key
  const currentSort = SORT_OPTIONS.find((o) => o.key === sortKey) ?? SORT_OPTIONS[0];

  // ── Navigation Title ──

  const navTitle = buildNavigationTitle(valuation, isLoading);

  // ── Portfolio Totals (assets vs liabilities) ──

  const portfolioTotals = buildPortfolioTotals(valuation);

  // ── Offline / Error Indicator ──

  const isOffline = errors.length > 0 && errors.every((e) => e.type === ErrorType.OFFLINE);
  const hasApiErrors = errors.some((e) => e.type === ErrorType.API_ERROR);

  // ── Search Bar with Sort Dropdown ──

  const searchPlaceholder = hasAccounts ? "Filter accounts and positions..." : "Portfolio Tracker";

  const searchBarAccessory = hasPositions ? (
    <List.Dropdown tooltip="Sort positions" value={sortKey} onChange={setSortKey}>
      <List.Dropdown.Section title="Sort By">
        {SORT_OPTIONS.map((option) => (
          <List.Dropdown.Item key={option.key} title={option.label} value={option.key} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  ) : undefined;

  // ── Toggle Detail Action (reused across items) ──

  const toggleDetailAction = (
    <Action
      title={isShowingDetail ? "Hide Detail Panel" : "Show Detail Panel"}
      icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["ctrl"], key: "d" }}
      onAction={() => setIsShowingDetail((prev) => !prev)}
    />
  );

  const toggleArchivedAction = hasArchivedDebt ? (
    <Action
      title={showArchivedDebt ? "Hide Archived Debt" : "Show Archived Debt"}
      icon={showArchivedDebt ? Icon.EyeDisabled : Icon.Tray}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "a" }}
      onAction={onToggleArchivedDebt}
    />
  ) : undefined;

  // ── Render ──

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && hasPositions}
      navigationTitle={navTitle}
      searchBarPlaceholder={searchPlaceholder}
      searchBarAccessory={searchBarAccessory}
    >
      {/* ── Empty State ── */}
      {!isLoading && !hasAccounts && (
        <EmptyPortfolio onAddAccount={onAddAccount} onLoadSample={onLoadSample} onImportExport={onImportExport} />
      )}

      {/* ── Sample Portfolio Banner ── */}
      {showSampleBanner && (
        <List.Section title="👋 Sample Portfolio">
          <List.Item
            icon={{ source: Icon.Info, tintColor: COLOR_PRIMARY }}
            title="You're viewing sample data"
            subtitle="Press Enter to remove sample data · Add your own accounts below"
            keywords={["sample", "demo", "preview"]}
            actions={
              <ActionPanel>
                <Action
                  title="Hide Sample Portfolio"
                  icon={Icon.EyeDisabled}
                  style={Action.Style.Destructive}
                  onAction={onRemoveSample}
                />
                <PortfolioActions
                  onAddAccount={onAddAccount}
                  onRefresh={onRefresh}
                  onImportExport={onImportExport}
                  onSearchInvestments={hasAccounts ? onSearchInvestments : undefined}
                  toggleDetailAction={toggleDetailAction}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* ── Offline Banner ── */}
      {isOffline && (
        <List.Section title="⚠️ Offline">
          <List.Item
            icon={{ source: Icon.WifiDisabled, tintColor: COLOR_WARNING }}
            title="Unable to fetch latest prices"
            subtitle="Showing cached data. Will retry automatically."
            actions={
              <ActionPanel>
                <PortfolioActions
                  onAddAccount={onAddAccount}
                  onRefresh={onRefresh}
                  onImportExport={onImportExport}
                  onSearchInvestments={hasAccounts ? onSearchInvestments : undefined}
                  toggleDetailAction={toggleDetailAction}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* ── API Error Banner ── */}
      {hasApiErrors && !isOffline && (
        <List.Section title="⚠️ Errors">
          {errors
            .filter((e) => e.type === ErrorType.API_ERROR)
            .map((error, index) => (
              <List.Item
                key={`error-${index}`}
                icon={{ source: Icon.ExclamationMark, tintColor: COLOR_DESTRUCTIVE }}
                title={error.symbol ? `Error fetching ${error.symbol}` : "API Error"}
                subtitle={error.message}
                accessories={[
                  {
                    text: formatRelativeTime(error.timestamp),
                    tooltip: error.timestamp,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <PortfolioActions
                      onAddAccount={onAddAccount}
                      onRefresh={onRefresh}
                      onImportExport={onImportExport}
                      onSearchInvestments={hasAccounts ? onSearchInvestments : undefined}
                      toggleDetailAction={toggleDetailAction}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}

      {/* ── Account Sections (with valuation data) ── */}
      {valuation?.accounts.map((accountVal) => (
        <AccountSection
          key={accountVal.account.id}
          accountValuation={accountVal}
          baseCurrency={valuation.baseCurrency}
          sortField={currentSort.field}
          sortDirection={currentSort.direction}
          isShowingDetail={isShowingDetail}
          showArchivedDebt={showArchivedDebt}
          toggleDetailAction={toggleDetailAction}
          toggleArchivedAction={toggleArchivedAction}
          onAddAccount={onAddAccount}
          onEditAccount={onEditAccount}
          onDeleteAccount={onDeleteAccount}
          onAddPosition={onAddPosition}
          onAddCash={onAddCash}
          onAddProperty={onAddProperty}
          onAddDebt={onAddDebt}
          onEditDebtPosition={onEditDebtPosition}
          onArchiveDebt={onArchiveDebt}
          onEditPropertyPosition={onEditPropertyPosition}
          onShowCalculations={onShowCalculations}
          onEditPosition={onEditPosition}
          onAddUnits={onAddUnits}
          onDeletePosition={onDeletePosition}
          onRefresh={onRefresh}
          onImportExport={onImportExport}
          onSearchInvestments={onSearchInvestments}
        />
      ))}

      {/* ── Portfolio Summary Row ── */}
      {valuation && hasPositions && portfolioTotals && (
        <List.Section title="Summary">
          <List.Item
            icon={Icon.Calculator}
            title="Portfolio Total ∑"
            accessories={
              isShowingDetail
                ? []
                : [
                    {
                      tag: {
                        value: `Assets: ${formatCurrency(portfolioTotals.assets, valuation.baseCurrency)}`,
                        color: COLOR_POSITIVE,
                      },
                    },
                    {
                      tag: {
                        value: `Liabilities: ${formatCurrency(portfolioTotals.liabilities, valuation.baseCurrency)}`,
                        color: portfolioTotals.liabilities < 0 ? COLOR_NEGATIVE : COLOR_NEUTRAL,
                      },
                    },
                    {
                      tag: {
                        value: `Net: ${formatCurrency(portfolioTotals.net, valuation.baseCurrency)}`,
                        color: portfolioTotals.net >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                      },
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Assets"
                      text={formatCurrency(portfolioTotals.assets, valuation.baseCurrency)}
                    />
                    <List.Item.Detail.Metadata.TagList title="Liabilities">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={formatCurrency(portfolioTotals.liabilities, valuation.baseCurrency)}
                        color={portfolioTotals.liabilities < 0 ? COLOR_NEGATIVE : COLOR_NEUTRAL}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Net Worth">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={formatCurrency(portfolioTotals.net, valuation.baseCurrency)}
                        color={portfolioTotals.net >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <PortfolioActions
                  onAddAccount={onAddAccount}
                  onRefresh={onRefresh}
                  onImportExport={onImportExport}
                  onSearchInvestments={hasAccounts ? onSearchInvestments : undefined}
                  toggleDetailAction={toggleDetailAction}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* ── Accounts Without Valuation (fallback while loading) ── */}
      {!valuation &&
        portfolio?.accounts.map((account) => (
          <FallbackAccountSection
            key={account.id}
            account={account}
            isShowingDetail={isShowingDetail}
            toggleDetailAction={toggleDetailAction}
            onAddAccount={onAddAccount}
            onEditAccount={onEditAccount}
            onDeleteAccount={onDeleteAccount}
            onAddPosition={onAddPosition}
            onAddCash={onAddCash}
            onRefresh={onRefresh}
            onImportExport={onImportExport}
            onSearchInvestments={onSearchInvestments}
          />
        ))}
    </List>
  );
}

// ──────────────────────────────────────────
// AccountSection Sub-Component
// ──────────────────────────────────────────

interface AccountSectionProps {
  accountValuation: AccountValuation;
  baseCurrency: string;
  sortField: SortField;
  sortDirection: SortDirection;
  isShowingDetail: boolean;
  showArchivedDebt: boolean;
  toggleDetailAction: React.JSX.Element;
  toggleArchivedAction?: React.JSX.Element;
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onAddPosition: (accountId: string) => void;
  onAddCash: (accountId: string) => void;
  onAddProperty: (accountId: string) => void;
  onAddDebt: (accountId: string) => void;
  onEditDebtPosition: (account: Account, position: Position) => void;
  onArchiveDebt: (accountId: string, positionId: string) => Promise<void>;
  onEditPropertyPosition: (account: Account, position: Position) => void;
  onShowCalculations: (position: Position, hpiChangePercent: number) => void;
  onEditPosition: (account: Account, position: Position) => void;
  onAddUnits: (account: Account, position: Position) => void;
  onDeletePosition: (accountId: string, positionId: string) => Promise<void>;
  onRefresh: () => void;
  onImportExport?: () => void;
  onSearchInvestments?: () => void;
}

function AccountSection({
  accountValuation,
  baseCurrency,
  sortField,
  sortDirection,
  isShowingDetail,
  showArchivedDebt,
  toggleDetailAction,
  toggleArchivedAction,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onAddPosition,
  onAddCash,
  onAddProperty,
  onAddDebt,
  onEditDebtPosition,
  onArchiveDebt,
  onEditPropertyPosition,
  onShowCalculations,
  onEditPosition,
  onAddUnits,
  onDeletePosition,
  onRefresh,
  onImportExport,
  onSearchInvestments,
}: AccountSectionProps): React.JSX.Element {
  const { account, positions, totalBaseValue } = accountValuation;

  // ── Account Type Tag ──

  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
  const typeColor = ACCOUNT_TYPE_COLORS[account.type] ?? COLOR_NEUTRAL;

  // Section subtitle: [Type Tag] · £12.3K · 4 positions
  const positionCount = positions.length;
  const sectionSubtitle =
    positionCount > 0
      ? `${typeLabel} · ${formatCurrencyCompact(totalBaseValue, baseCurrency)} · ${positionCount} position${positionCount === 1 ? "" : "s"}`
      : `${typeLabel} · No positions`;

  // ── Sort Positions ──

  // Filter out archived debt positions unless showArchivedDebt is on
  const visiblePositions = useMemo(() => {
    if (showArchivedDebt) return positions;
    return positions.filter((pv) => {
      if (isDebtAssetType(pv.position.assetType) && pv.position.debtData?.archived) {
        return false;
      }
      return true;
    });
  }, [positions, showArchivedDebt]);

  const sortedPositions = useMemo(() => {
    return sortPositions(visiblePositions, sortField, sortDirection);
  }, [visiblePositions, sortField, sortDirection]);

  return (
    <List.Section title={account.name} subtitle={sectionSubtitle}>
      {/* ── Empty Account Prompt ── */}
      {positionCount === 0 && (
        <List.Item
          icon={Icon.PlusCircle}
          title="Add your first position"
          subtitle="Search for stocks, ETFs, or funds"
          keywords={[account.name, typeLabel]}
          actions={
            <ActionPanel>
              <AccountActions
                account={account}
                onAddPosition={() => onAddPosition(account.id)}
                onAddCash={() => onAddCash(account.id)}
                onAddProperty={() => onAddProperty(account.id)}
                onAddDebt={() => onAddDebt(account.id)}
                onEditAccount={() => onEditAccount(account)}
                onDeleteAccount={() => onDeleteAccount(account.id)}
              />
              <PortfolioActions
                onAddAccount={onAddAccount}
                onRefresh={onRefresh}
                onImportExport={onImportExport}
                onSearchInvestments={onSearchInvestments}
                toggleDetailAction={toggleDetailAction}
              />
            </ActionPanel>
          }
        />
      )}

      {/* ── Sorted Position Items ── */}
      {sortedPositions.map((positionVal) => {
        const isPropertyPos = isPropertyAssetType(positionVal.position.assetType);
        const isDebtPos = isDebtAssetType(positionVal.position.assetType);
        return (
          <PositionListItem
            key={positionVal.position.id}
            valuation={positionVal}
            baseCurrency={baseCurrency}
            accountName={account.name}
            isShowingDetail={isShowingDetail}
            actions={
              <ActionPanel>
                <PositionActions
                  position={positionVal.position}
                  accountId={account.id}
                  isProperty={isPropertyPos}
                  isDebt={isDebtPos}
                  onAddUnits={() => onAddUnits(account, positionVal.position)}
                  onEditPosition={() =>
                    isPropertyPos
                      ? onEditPropertyPosition(account, positionVal.position)
                      : isDebtPos
                        ? onEditDebtPosition(account, positionVal.position)
                        : onEditPosition(account, positionVal.position)
                  }
                  onEditDebt={isDebtPos ? () => onEditDebtPosition(account, positionVal.position) : undefined}
                  onArchiveDebt={isDebtPos ? () => onArchiveDebt(account.id, positionVal.position.id) : undefined}
                  onAddValuation={
                    isPropertyPos ? () => onEditPropertyPosition(account, positionVal.position) : undefined
                  }
                  onShowCalculations={
                    isPropertyPos
                      ? () => onShowCalculations(positionVal.position, positionVal.hpiChangePercent ?? 0)
                      : undefined
                  }
                  onDeletePosition={() => onDeletePosition(account.id, positionVal.position.id)}
                />
                <AccountActions
                  account={account}
                  onAddPosition={() => onAddPosition(account.id)}
                  onAddCash={() => onAddCash(account.id)}
                  onAddProperty={() => onAddProperty(account.id)}
                  onAddDebt={() => onAddDebt(account.id)}
                  onEditAccount={() => onEditAccount(account)}
                  onDeleteAccount={async () => await onDeleteAccount(account.id)}
                />
                <PortfolioActions
                  onAddAccount={onAddAccount}
                  onRefresh={onRefresh}
                  onImportExport={onImportExport}
                  onSearchInvestments={onSearchInvestments}
                  toggleDetailAction={toggleDetailAction}
                />
                {toggleArchivedAction && <ActionPanel.Section title="Debt">{toggleArchivedAction}</ActionPanel.Section>}
              </ActionPanel>
            }
          />
        );
      })}

      {/* ── Account Summary Row (pinned to bottom) ── */}
      {visiblePositions.length > 0 && (
        <List.Item
          icon={{ source: Icon.Coins, tintColor: typeColor }}
          title={`${account.name} Total`}
          subtitle={isShowingDetail ? formatCurrency(totalBaseValue, baseCurrency) : undefined}
          keywords={[account.name, typeLabel, "total", "summary"]}
          accessories={
            isShowingDetail
              ? undefined
              : [
                  {
                    tag: { value: typeLabel, color: typeColor },
                  },
                  {
                    text: { value: formatCurrency(totalBaseValue, baseCurrency), color: COLOR_PRIMARY },
                    tooltip: `${account.name} total value`,
                  },
                ]
          }
          detail={
            isShowingDetail ? (
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Account" text={account.name} />
                    <List.Item.Detail.Metadata.TagList title="Type">
                      <List.Item.Detail.Metadata.TagList.Item text={typeLabel} color={typeColor} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Positions" text={String(positionCount)} />
                    <List.Item.Detail.Metadata.Label
                      title="Total Value"
                      text={formatCurrency(totalBaseValue, baseCurrency)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            ) : undefined
          }
          actions={
            <ActionPanel>
              <AccountActions
                account={account}
                onAddPosition={() => onAddPosition(account.id)}
                onAddCash={() => onAddCash(account.id)}
                onAddProperty={() => onAddProperty(account.id)}
                onAddDebt={() => onAddDebt(account.id)}
                onEditAccount={() => onEditAccount(account)}
                onDeleteAccount={() => onDeleteAccount(account.id)}
              />
              <PortfolioActions
                onAddAccount={onAddAccount}
                onRefresh={onRefresh}
                onImportExport={onImportExport}
                onSearchInvestments={onSearchInvestments}
                toggleDetailAction={toggleDetailAction}
              />
              {toggleArchivedAction && <ActionPanel.Section title="Debt">{toggleArchivedAction}</ActionPanel.Section>}
            </ActionPanel>
          }
        />
      )}
    </List.Section>
  );
}

// ──────────────────────────────────────────
// FallbackAccountSection (no valuation yet)
// ──────────────────────────────────────────

interface FallbackAccountSectionProps {
  account: Account;
  isShowingDetail: boolean;
  toggleDetailAction: React.JSX.Element;
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onAddPosition: (accountId: string) => void;
  onAddCash: (accountId: string) => void;
  onRefresh: () => void;
  onImportExport?: () => void;
  onSearchInvestments?: () => void;
}

function FallbackAccountSection({
  account,
  isShowingDetail,
  toggleDetailAction,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onAddPosition,
  onAddCash,
  onRefresh,
  onImportExport,
  onSearchInvestments,
}: FallbackAccountSectionProps): React.JSX.Element {
  // isShowingDetail is received to satisfy the prop contract but not used here
  // because fallback items have no valuation data for the detail panel.
  void isShowingDetail;
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;

  return (
    <List.Section
      key={account.id}
      title={account.name}
      subtitle={`${typeLabel} · ${account.positions.length} position${account.positions.length === 1 ? "" : "s"}`}
    >
      {account.positions.length === 0 ? (
        <List.Item
          icon={Icon.PlusCircle}
          title="Add your first position"
          subtitle="Search for stocks, ETFs, or funds"
          keywords={[account.name, typeLabel]}
          actions={
            <ActionPanel>
              <AccountActions
                account={account}
                onAddPosition={() => onAddPosition(account.id)}
                onAddCash={() => onAddCash(account.id)}
                onEditAccount={() => onEditAccount(account)}
                onDeleteAccount={() => onDeleteAccount(account.id)}
              />
              <PortfolioActions
                onAddAccount={onAddAccount}
                onRefresh={onRefresh}
                onImportExport={onImportExport}
                onSearchInvestments={onSearchInvestments}
                toggleDetailAction={toggleDetailAction}
              />
            </ActionPanel>
          }
        />
      ) : (
        account.positions.map((position) => (
          <List.Item
            key={position.id}
            icon={Icon.CircleProgress}
            title={getDisplayName(position)}
            subtitle={`${position.symbol} · Loading...`}
            keywords={[position.symbol, account.name, typeLabel]}
            actions={
              <ActionPanel>
                <AccountActions
                  account={account}
                  onAddPosition={() => onAddPosition(account.id)}
                  onAddCash={() => onAddCash(account.id)}
                  onEditAccount={() => onEditAccount(account)}
                  onDeleteAccount={() => onDeleteAccount(account.id)}
                />
                <PortfolioActions
                  onAddAccount={onAddAccount}
                  onRefresh={onRefresh}
                  onImportExport={onImportExport}
                  onSearchInvestments={onSearchInvestments}
                  toggleDetailAction={toggleDetailAction}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List.Section>
  );
}

// ──────────────────────────────────────────
// Sorting
// ──────────────────────────────────────────

/**
 * Sorts an array of PositionValuation by the given field and direction.
 * Returns a new array (does not mutate the input).
 */
function sortPositions(
  positions: PositionValuation[],
  field: SortField,
  direction: SortDirection,
): PositionValuation[] {
  const sorted = [...positions];

  sorted.sort((a, b) => {
    let valueA: number;
    let valueB: number;

    switch (field) {
      case SortField.VALUE:
        valueA = a.totalBaseValue;
        valueB = b.totalBaseValue;
        break;
      case SortField.CHANGE:
        valueA = a.changePercent;
        valueB = b.changePercent;
        break;
      default:
        valueA = a.totalBaseValue;
        valueB = b.totalBaseValue;
    }

    return direction === SortDirection.DESC ? valueB - valueA : valueA - valueB;
  });

  return sorted;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

/**
 * Builds the navigation title string showing total portfolio value.
 *
 * Examples:
 * - Loading: "Portfolio Tracker"
 * - With data: "Portfolio Tracker — £142,350.00"
 * - Empty: "Portfolio Tracker — £0.00"
 */
function buildNavigationTitle(valuation: PortfolioValuation | undefined, isLoading: boolean): string {
  const base = "Portfolio Tracker";

  if (isLoading && !valuation) {
    return base;
  }

  if (!valuation || valuation.accounts.length === 0) {
    return base;
  }

  const totalFormatted = formatCurrency(valuation.totalValue, valuation.baseCurrency);

  return `${base} — ${totalFormatted}`;
}

/**
 * Computes asset / liability / net totals from the portfolio valuation.
 *
 * Assets = sum of all non-debt account values (always ≥ 0)
 * Liabilities = sum of all debt account values (negative or 0)
 * Net = assets + liabilities (= valuation.totalValue)
 */
function buildPortfolioTotals(
  valuation: PortfolioValuation | undefined,
): { assets: number; liabilities: number; net: number } | undefined {
  if (!valuation || valuation.accounts.length === 0) return undefined;

  let assets = 0;
  let liabilities = 0;

  for (const av of valuation.accounts) {
    if (isDebtAccountType(av.account.type)) {
      liabilities += av.totalBaseValue;
    } else {
      assets += av.totalBaseValue;
    }
  }

  return { assets, liabilities, net: assets + liabilities };
}
