/**
 * FireDashboard component — the main FIRE results view.
 *
 * Displays the projection chart and key metrics after FIRE settings
 * have been configured. This is a read-only view — all mutations
 * happen via pushed sub-views (FireSetup for settings, FireContributions
 * for contributions).
 *
 * Layout:
 *   - Markdown area (left): projection chart, status message, contributions table
 *   - Metadata panel (right): key metrics — FIRE year, age, days, portfolio value, etc.
 *
 * Actions:
 *   - Edit FIRE Settings → pushes FireSetup in edit mode
 *   - Manage Contributions → pushes FireContributions
 *   - Reset FIRE Settings → clears all FIRE data with confirmation
 *
 * The component reads portfolio data (via props) but never modifies it.
 * FIRE settings are modified only through the pushed sub-views.
 *
 * Usage (rendered by fire.tsx when settings exist):
 * ```tsx
 * <FireDashboard
 *   settings={settings}
 *   portfolio={portfolio}
 *   valuation={valuation}
 *   baseCurrency="GBP"
 *   onSaveSettings={save}
 *   onSaveContributions={async (c) => { await save({ ...settings, contributions: c }); }}
 *   onClearSettings={clear}
 *   revalidateSettings={revalidate}
 * />
 * ```
 */

import React from "react";
import { useMemo } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Alert,
  Icon,
  useNavigation,
  confirmAlert,
  environment,
  open,
  showToast,
  Toast,
  showHUD,
} from "@raycast/api";
import {
  Portfolio,
  PortfolioValuation,
  isLockedAccountType,
  isDebtAccountType,
  isDebtAssetType,
  isDebtArchived,
  isDebtPaidOff,
} from "../utils/types";
import { FireSettings, FireContribution, FireProjection } from "../utils/fire-types";
import { calculateProjection, totalAnnualContribution } from "../services/fire-calculator";
import {
  buildDashboardMarkdown,
  SplitPortfolioData,
  DebtPortfolioData,
  DashboardMarkdownResult,
} from "../utils/fire-charts";
import { getDisplayName } from "../utils/formatting";
import { formatCurrency } from "../utils/formatting";
import {
  COLOR_POSITIVE,
  COLOR_NEGATIVE,
  COLOR_NEUTRAL,
  COLOR_PRIMARY,
  COLOR_WARNING,
  COLOR_DESTRUCTIVE,
} from "../utils/constants";
import { writeSvgToTempFile, saveSvgToDownloads } from "../utils/fire-chart-export";
import { FireSetup } from "./FireSetup";
import { FireContributions } from "./FireContributions";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

export interface FireDashboardProps {
  /** Current FIRE settings */
  settings: FireSettings;

  /** Current portfolio data (read-only) */
  portfolio: Portfolio | undefined;

  /** Current portfolio valuation (for total value) */
  valuation: PortfolioValuation | undefined;

  /** User's base currency code */
  baseCurrency: string;

  /** Save updated FIRE settings (full object) */
  onSaveSettings: (settings: FireSettings) => Promise<void>;

  /** Save updated contributions array */
  onSaveContributions: (contributions: FireContribution[]) => Promise<void>;

  /** Clear all FIRE settings (reset) */
  onClearSettings: () => Promise<void>;

  /** Force re-read of FIRE settings from storage */
  revalidateSettings: () => void;
}

// ──────────────────────────────────────────
// Currency Symbols (local)
// ──────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CHF: "Fr",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
};

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function FireDashboard({
  settings,
  portfolio,
  valuation,
  baseCurrency,
  onSaveSettings,
  onSaveContributions,
  onClearSettings,
  revalidateSettings,
}: FireDashboardProps): React.JSX.Element {
  const { push, pop } = useNavigation();
  const currencySymbol = CURRENCY_SYMBOLS[baseCurrency] ?? baseCurrency;

  // ── Compute included accounts and portfolio value ──

  const accounts = portfolio?.accounts ?? [];

  const includedAccounts = useMemo(() => {
    return accounts.filter((a) => !settings.excludedAccountIds.includes(a.id));
  }, [accounts, settings.excludedAccountIds]);

  const includedPortfolioValue = useMemo(() => {
    if (!valuation) return 0;

    return valuation.accounts
      .filter((av) => !settings.excludedAccountIds.includes(av.account.id))
      .reduce((sum, av) => sum + av.totalBaseValue, 0);
  }, [valuation, settings.excludedAccountIds]);

  // ── Compute projection ──

  const annualContrib = useMemo(() => totalAnnualContribution(settings.contributions), [settings.contributions]);

  // ── Compute accessible vs locked portfolio split ──

  const splitData: SplitPortfolioData | undefined = useMemo(() => {
    if (!valuation) return undefined;

    const includedAccountValuations = valuation.accounts.filter(
      (av) => !settings.excludedAccountIds.includes(av.account.id),
    );

    const lockedValue = includedAccountValuations
      .filter((av) => isLockedAccountType(av.account.type))
      .reduce((sum, av) => sum + av.totalBaseValue, 0);

    const accessibleValue = includedPortfolioValue - lockedValue;

    // Split contributions by account type
    const lockedAnnualContribution = settings.contributions
      .filter((c) => {
        const account = accounts.find((a) => a.id === c.accountId);
        return account && isLockedAccountType(account.type) && c.monthlyAmount > 0;
      })
      .reduce((sum, c) => sum + c.monthlyAmount * 12, 0);

    const accessibleAnnualContribution = annualContrib - lockedAnnualContribution;

    // Only return split data if there are actually locked accounts/contributions
    if (lockedValue <= 0 && lockedAnnualContribution <= 0) return undefined;

    return {
      accessibleValue,
      lockedValue,
      accessibleAnnualContribution,
      lockedAnnualContribution,
    };
  }, [valuation, settings.excludedAccountIds, settings.contributions, accounts, includedPortfolioValue, annualContrib]);

  const projection: FireProjection = useMemo(() => {
    return calculateProjection({
      currentPortfolioValue: includedPortfolioValue,
      targetValue: settings.targetValue,
      annualGrowthRate: settings.annualGrowthRate,
      annualInflation: settings.annualInflation,
      annualContribution: annualContrib,
      yearOfBirth: settings.yearOfBirth,
      sippAccessAge: settings.sippAccessAge,
      holidayEntitlement: settings.holidayEntitlement,
    });
  }, [includedPortfolioValue, settings, annualContrib]);

  // ── Resolve contribution display names ──

  const resolvedContributions = useMemo(() => {
    return settings.contributions.map((c) => {
      const account = accounts.find((a) => a.id === c.accountId);
      const position = account?.positions.find((p) => p.id === c.positionId);
      return {
        ...c,
        displayName: position ? getDisplayName(position) : "Unknown Position",
        accountName: account?.name ?? "Unknown Account",
      };
    });
  }, [settings.contributions, accounts]);

  // ── Build markdown + raw SVGs ──

  // ── Compute debt data for charts ──

  const debtData: DebtPortfolioData | undefined = useMemo(() => {
    if (!portfolio) return undefined;

    const debtPositions = portfolio.accounts
      .filter((a) => isDebtAccountType(a.type) && !settings.excludedAccountIds.includes(a.id))
      .flatMap((a) =>
        a.positions.filter(
          (p) =>
            isDebtAssetType(p.assetType) && p.debtData && !isDebtArchived(p.debtData) && !isDebtPaidOff(p.debtData),
        ),
      );

    if (debtPositions.length === 0) return undefined;

    const positions = debtPositions.map((p) => ({
      name: p.customName ?? p.name,
      currentBalance: p.debtData!.currentBalance,
      apr: p.debtData!.apr,
      monthlyRepayment: p.debtData!.monthlyRepayment,
    }));

    const totalDebt = positions.reduce((sum, dp) => sum + dp.currentBalance, 0);
    if (totalDebt <= 0) return undefined;

    return { totalDebt, positions };
  }, [portfolio, settings.excludedAccountIds]);

  const theme = environment.appearance === "light" ? "light" : "dark";

  const dashboardData: DashboardMarkdownResult = useMemo(() => {
    return buildDashboardMarkdown(
      projection,
      settings,
      baseCurrency,
      resolvedContributions,
      theme,
      splitData,
      debtData,
    );
  }, [projection, settings, baseCurrency, resolvedContributions, theme, splitData, debtData]);

  const { markdown, growthSvg, splitSvg, debtSvg } = dashboardData;

  // ── Chart Action Handlers ──

  async function handleOpenChart(svg: string, filename: string): Promise<void> {
    try {
      const filePath = await writeSvgToTempFile(svg, filename);
      await open(filePath);
    } catch (error) {
      console.error("Failed to open chart:", error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to open chart" });
    }
  }

  async function handleDownloadChart(svg: string, filename: string): Promise<void> {
    try {
      await saveSvgToDownloads(svg, filename);
      await showHUD(`Saved ${filename} to Downloads`);
    } catch (error) {
      console.error("Failed to save chart:", error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to save chart" });
    }
  }

  // ── Navigation Handlers ──

  function handleEditSettings(): void {
    push(
      <FireSetup
        settings={settings}
        accounts={accounts}
        currentPortfolioValue={includedPortfolioValue}
        baseCurrency={baseCurrency}
        onSave={async (newSettings) => {
          await onSaveSettings(newSettings);
          pop();
          revalidateSettings();
        }}
      />,
    );
  }

  function handleManageContributions(): void {
    push(
      <FireContributions
        contributions={settings.contributions}
        accounts={includedAccounts}
        baseCurrency={baseCurrency}
        onSave={async (contributions) => {
          await onSaveContributions(contributions);
        }}
        onDone={() => {
          pop();
          revalidateSettings();
        }}
      />,
    );
  }

  async function handleResetSettings(): Promise<void> {
    const confirmed = await confirmAlert({
      title: "Reset FIRE Settings?",
      message: "This will remove all FIRE configuration including contributions. You'll need to set up FIRE again.",
      icon: { source: Icon.Trash, tintColor: COLOR_DESTRUCTIVE },
      primaryAction: {
        title: "Reset Everything",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (confirmed) {
      await onClearSettings();
    }
  }

  // ── Metadata Panel ──

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - settings.yearOfBirth;
  const sippYear = settings.yearOfBirth + settings.sippAccessAge;
  const realRate = settings.annualGrowthRate - settings.annualInflation;
  const monthlyContrib = annualContrib / 12;

  const isLoading = !valuation;

  // ── Render ──

  return (
    <Detail
      navigationTitle="🔥 FIRE Dashboard"
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {/* ── Progress ── */}
          <Detail.Metadata.Label
            title="Current Portfolio"
            text={formatCurrency(includedPortfolioValue, baseCurrency)}
          />
          <Detail.Metadata.Label title="FIRE Target" text={formatCurrency(settings.targetValue, baseCurrency)} />

          {includedPortfolioValue > 0 && settings.targetValue > 0 && (
            <Detail.Metadata.TagList title="Progress">
              <Detail.Metadata.TagList.Item
                text={`${Math.min(100, Math.round((includedPortfolioValue / settings.targetValue) * 100))}%`}
                color={includedPortfolioValue >= settings.targetValue ? COLOR_POSITIVE : COLOR_PRIMARY}
              />
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          {/* ── FIRE Target Date ── */}
          {projection.targetHitInWindow && (
            <Detail.Metadata.TagList title="🔥 FIRE Year">
              <Detail.Metadata.TagList.Item text={String(projection.fireYear)} color={COLOR_POSITIVE} />
            </Detail.Metadata.TagList>
          )}
          {projection.targetHitInWindow && <Detail.Metadata.Label title="Age at FIRE" text={`${projection.fireAge}`} />}
          {projection.targetHitInWindow && (
            <Detail.Metadata.Label
              title="Years to FIRE"
              text={`${(projection.fireYear ?? currentYear) - currentYear}`}
            />
          )}
          {projection.targetHitInWindow && <Detail.Metadata.Separator />}
          {projection.targetHitInWindow && (
            <Detail.Metadata.Label
              title="Days to FIRE"
              text={projection.daysToFire !== null ? projection.daysToFire.toLocaleString("en") : "—"}
            />
          )}
          {projection.targetHitInWindow && (
            <Detail.Metadata.Label
              title="Working Days"
              text={projection.workingDaysToFire !== null ? projection.workingDaysToFire.toLocaleString("en") : "—"}
            />
          )}
          {!projection.targetHitInWindow && (
            <Detail.Metadata.TagList title="⚠️ FIRE Year">
              <Detail.Metadata.TagList.Item text="Not within 30 years" color={COLOR_WARNING} />
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          {/* ── Contributions ── */}
          <Detail.Metadata.Label
            title="Monthly Contributions"
            text={
              monthlyContrib > 0
                ? `${currencySymbol}${monthlyContrib.toLocaleString("en", { maximumFractionDigits: 0 })}`
                : "None"
            }
          />
          <Detail.Metadata.Label
            title="Annual Contributions"
            text={
              annualContrib > 0
                ? `${currencySymbol}${annualContrib.toLocaleString("en", { maximumFractionDigits: 0 })}`
                : "None"
            }
          />

          <Detail.Metadata.Separator />

          {/* ── Assumptions ── */}
          <Detail.Metadata.Label title="Growth Rate" text={`${settings.annualGrowthRate}%`} />
          <Detail.Metadata.Label title="Inflation" text={`${settings.annualInflation}%`} />
          <Detail.Metadata.TagList title="Real Return">
            <Detail.Metadata.TagList.Item
              text={`${realRate.toFixed(1)}%`}
              color={realRate > 0 ? COLOR_POSITIVE : realRate < 0 ? COLOR_NEGATIVE : COLOR_NEUTRAL}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Withdrawal Rate" text={`${settings.withdrawalRate}%`} />

          <Detail.Metadata.Separator />

          {/* ── Personal ── */}
          <Detail.Metadata.Label title="Current Age" text={`${currentAge}`} />
          <Detail.Metadata.Label title="Pension Access" text={`Age ${settings.sippAccessAge} (${sippYear})`} />
          <Detail.Metadata.Label title="Included Accounts" text={`${includedAccounts.length} of ${accounts.length}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="FIRE">
            <Action
              title="Manage Contributions"
              icon={Icon.BankNote}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={handleManageContributions}
            />
            <Action
              title="Edit FIRE Settings"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={handleEditSettings}
            />
            <Action
              title="Reset FIRE Settings"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleResetSettings}
            />
          </ActionPanel.Section>

          {/* ── Chart Actions ── */}
          {(growthSvg || splitSvg || debtSvg) && (
            <ActionPanel.Section title="Charts">
              {growthSvg && (
                <Action
                  title="Open Growth Chart"
                  icon={Icon.Maximize}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={() => handleOpenChart(growthSvg, "fire-growth-projection.svg")}
                />
              )}
              {splitSvg && (
                <Action
                  title="Open Split Chart"
                  icon={Icon.Maximize}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  onAction={() => handleOpenChart(splitSvg, "fire-split-projection.svg")}
                />
              )}
              {debtSvg && (
                <Action
                  title="Open Debt Chart"
                  icon={Icon.Maximize}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                  onAction={() => handleOpenChart(debtSvg, "fire-debt-projection.svg")}
                />
              )}
              {growthSvg && (
                <Action
                  title="Save Growth Chart"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => handleDownloadChart(growthSvg, "FIRE-Growth-Projection.svg")}
                />
              )}
              {splitSvg && (
                <Action
                  title="Save Split Chart"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onAction={() => handleDownloadChart(splitSvg, "FIRE-Split-Projection.svg")}
                />
              )}
              {debtSvg && (
                <Action
                  title="Save Debt Chart"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
                  onAction={() => handleDownloadChart(debtSvg, "FIRE-Debt-Projection.svg")}
                />
              )}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
