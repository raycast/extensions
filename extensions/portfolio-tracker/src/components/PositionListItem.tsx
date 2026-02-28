/**
 * PositionListItem component.
 *
 * Renders a single position (holding) as a List.Item within the portfolio view.
 * This is the most frequently rendered component in the extension — every position
 * in every account renders as one of these.
 *
 * Supports two display modes controlled by the parent's `isShowingDetail` toggle:
 *
 * **Default mode (no detail panel):**
 * Full-width list with rich accessories showing key financial data at a glance.
 * ```
 * [icon] Vanguard S&P 500 UCITS ETF          £72.45   +1.25%   £3,622.50
 *        VUSA.L · 50 units
 * ```
 *
 * **Detail mode (with detail panel):**
 * Split-pane layout. Left side shows name + financial summary in subtitle.
 * Right side shows the full metadata detail panel.
 * ```
 * [icon] Vanguard S&P 500 UCITS ETF     |  [Detail Panel]
 *        VUSA.L · £72.45 · +1.25%       |
 * ```
 *
 * **Cash positions** are rendered with simplified display:
 * - No price-per-unit (always 1.0, meaningless to show)
 * - No daily change (always 0%)
 * - Subtitle shows the cash amount directly
 * - Detail panel omits price/change section
 *
 * Keywords include the account name, symbol, asset type, and currency
 * so that filtering in the search bar matches accounts and asset attributes.
 *
 * Usage:
 * ```tsx
 * <PositionListItem
 *   valuation={positionValuation}
 *   baseCurrency="GBP"
 *   accountName="Vanguard ISA"
 *   isShowingDetail={false}
 *   actions={<ActionPanel>...</ActionPanel>}
 * />
 * ```
 */

import React from "react";
import { Color, Icon, List } from "@raycast/api";
import { PositionValuation, AssetType, isPropertyAssetType, isDebtAssetType, isDebtPaidOff } from "../utils/types";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatUnits,
  formatDate,
  getDisplayName,
  hasCustomName,
} from "../utils/formatting";
import {
  ASSET_TYPE_LABELS,
  COLOR_POSITIVE,
  COLOR_NEGATIVE,
  COLOR_NEUTRAL,
  COLOR_PRIMARY,
  COLOR_MUTED,
} from "../utils/constants";
import { calculateCurrentEquity, getCurrentPrincipalInterestRatio } from "../services/mortgage-calculator";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface PositionListItemProps {
  /** The computed valuation data for this position */
  valuation: PositionValuation;

  /** The user's base currency for displaying converted values */
  baseCurrency: string;

  /** The name of the parent account (used for keywords / filtering) */
  accountName: string;

  /** Whether the parent List is showing the detail panel */
  isShowingDetail: boolean;

  /**
   * ActionPanel element to render when this item is selected.
   * Composed by the parent to include position, account, and portfolio actions.
   */
  actions: React.JSX.Element;
}

// ──────────────────────────────────────────
// Asset Type → Icon Mapping
// ──────────────────────────────────────────

const ASSET_TYPE_ICONS: Record<AssetType, Icon> = {
  [AssetType.EQUITY]: Icon.Building,
  [AssetType.ETF]: Icon.BarChart,
  [AssetType.MUTUALFUND]: Icon.BankNote,
  [AssetType.INDEX]: Icon.LineChart,
  [AssetType.CURRENCY]: Icon.Coins,
  [AssetType.CRYPTOCURRENCY]: Icon.Crypto,
  [AssetType.OPTION]: Icon.Switch,
  [AssetType.FUTURE]: Icon.Calendar,
  [AssetType.CASH]: Icon.BankNote,
  [AssetType.MORTGAGE]: Icon.House,
  [AssetType.OWNED_PROPERTY]: Icon.House,
  [AssetType.CREDIT_CARD]: Icon.CreditCard,
  [AssetType.LOAN]: Icon.BankNote,
  [AssetType.STUDENT_LOAN]: Icon.Book,
  [AssetType.AUTO_LOAN]: Icon.Car,
  [AssetType.BNPL]: Icon.CreditCard,
  [AssetType.UNKNOWN]: Icon.QuestionMarkCircle,
};

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function PositionListItem({
  valuation,
  baseCurrency,
  accountName,
  isShowingDetail,
  actions,
}: PositionListItemProps): React.JSX.Element {
  const { position, currentPrice, totalNativeValue, totalBaseValue, change, changePercent, fxRate, hpiChangePercent } =
    valuation;

  // ── Computed Display Values ──

  const icon = ASSET_TYPE_ICONS[position.assetType] ?? Icon.QuestionMarkCircle;
  const typeLabel = ASSET_TYPE_LABELS[position.assetType] ?? "Unknown";
  const isCash = position.assetType === AssetType.CASH;
  const isProperty = isPropertyAssetType(position.assetType);
  const isDebt = isDebtAssetType(position.assetType);
  const isPaidOff = isDebt && position.debtData ? isDebtPaidOff(position.debtData) : false;
  const isArchived = isDebt && position.debtData?.archived === true;
  const displayName = getDisplayName(position);
  const isRenamed = hasCustomName(position);

  const isCrossCurrency = position.currency !== baseCurrency;
  const hasPrice = currentPrice > 0;

  // Change colour:
  // - Cash: always neutral (change is 0)
  // - Property: uses HPI change since valuation (can be positive/negative)
  // - Regular: daily market change
  const changeColor = isCash
    ? COLOR_NEUTRAL
    : changePercent > 0
      ? COLOR_POSITIVE
      : changePercent < 0
        ? COLOR_NEGATIVE
        : COLOR_NEUTRAL;

  // ── Keywords (for search bar filtering) ──
  // Include account name so filtering by account name shows its positions.
  // Include symbol, type, and currency for broad searchability.

  // Include both display name and original name so filtering works with either.
  // Property positions also include "property", "mortgage", and postcode.
  const keywords = [
    position.symbol,
    accountName,
    typeLabel,
    position.currency,
    position.name,
    displayName,
    "cash",
    ...(isProperty ? ["property", "mortgage", "house", position.mortgageData?.postcode ?? ""] : []),
    ...(isDebt ? ["debt", "loan", "credit", "repayment"] : []),
  ];

  // ── Mode-Specific Rendering ──

  if (isShowingDetail) {
    return renderDetailMode({
      position,
      icon,
      typeLabel,
      isCash,
      isProperty,
      isDebt,
      isPaidOff,
      isArchived,
      hasPrice,
      currentPrice,
      totalNativeValue,
      totalBaseValue,
      change,
      changePercent,
      changeColor,
      fxRate,
      isCrossCurrency,
      baseCurrency,
      displayName,
      isRenamed,
      hpiChangePercent,
      keywords,
      actions,
    });
  }

  return renderListMode({
    position,
    icon,
    isCash,
    isProperty,
    isDebt,
    isPaidOff,
    isArchived,
    hasPrice,
    currentPrice,
    totalBaseValue,
    changePercent,
    changeColor,
    baseCurrency,
    displayName,
    isRenamed,
    hpiChangePercent,
    keywords,
    actions,
  });
}

// ──────────────────────────────────────────
// Default Mode — Full-Width List (no detail panel)
// ──────────────────────────────────────────

interface ListModeProps {
  position: PositionValuation["position"];
  icon: Icon;
  isCash: boolean;
  isProperty: boolean;
  isDebt: boolean;
  isPaidOff: boolean;
  isArchived: boolean;
  hasPrice: boolean;
  currentPrice: number;
  totalBaseValue: number;
  changePercent: number;
  changeColor: Color;
  baseCurrency: string;
  displayName: string;
  isRenamed: boolean;
  hpiChangePercent?: number;
  keywords: string[];
  actions: React.JSX.Element;
}

/**
 * Renders the position as a full-width list item with accessories.
 *
 * **Securities layout:**
 * ```
 * [icon] Name                           £72.45   +1.25%   £3,622.50
 *        VUSA.L · 50 units
 * ```
 *
 * **Cash layout:**
 * ```
 * [icon] Cash (GBP)                                       £500.00
 *        GBP · £500.00
 * ```
 *
 * Accessories (left → right, rightmost = highest priority / preserved longest):
 * For securities: price, daily change tag, total value
 * For cash: total value only (price=1.0 and change=0% are meaningless)
 */
function renderListMode({
  position,
  icon,
  isCash,
  isProperty,
  isDebt,
  isPaidOff,
  isArchived,
  hasPrice,
  currentPrice,
  totalBaseValue,
  changePercent,
  changeColor,
  baseCurrency,
  displayName,
  isRenamed,
  hpiChangePercent,
  keywords,
  actions,
}: ListModeProps): React.JSX.Element {
  // ── Subtitle ──
  // Cash: "GBP · £500.00" (currency + formatted amount)
  // Debt: "💳 Credit Card · £200/mo" or just the type label when paid off
  // Securities: "VUSA.L · 50 units" (symbol + unit count)

  const subtitle = isCash
    ? `${position.currency} · ${formatCurrency(position.units, position.currency)}`
    : isDebt && position.debtData
      ? isPaidOff
        ? (ASSET_TYPE_LABELS[position.assetType] ?? "Debt")
        : `${formatCurrency(position.debtData.monthlyRepayment, position.currency)}/mo · ${position.debtData.apr}% APR`
      : isProperty
        ? `${position.mortgageData?.postcode ?? position.symbol} · ${position.assetType === AssetType.MORTGAGE ? "Mortgage" : "Owned"}`
        : `${position.symbol} · ${formatUnits(position.units)} units`;

  // ── Accessories ──

  const accessories: List.Item.Accessory[] = [];

  if (isCash) {
    // Cash: just show total value in base currency (or native if same)
    accessories.push({
      text: { value: formatCurrencyCompact(totalBaseValue, baseCurrency), color: COLOR_PRIMARY },
      tooltip: `Cash balance: ${formatCurrency(totalBaseValue, baseCurrency)}`,
    });
  } else if (isDebt && position.debtData) {
    // Debt: show balance (positive for display) and paid-off / archived tags
    if (isPaidOff) {
      accessories.push({
        tag: { value: "☑️ Paid Off", color: COLOR_MUTED },
        tooltip: "This debt has been fully repaid",
      });
    } else {
      // Show the outstanding balance as a red value
      accessories.push({
        text: {
          value: formatCurrencyCompact(currentPrice, position.currency),
          color: COLOR_NEGATIVE,
        },
        tooltip: `Outstanding balance: ${formatCurrency(currentPrice, position.currency)}`,
      });
    }
    if (isArchived) {
      accessories.push({
        tag: { value: "📦 Archived", color: COLOR_MUTED },
        tooltip: "This debt is archived and excluded from totals",
      });
    }
    // Debt total in base currency (negative, shown with minus sign)
    if (!isPaidOff && !isArchived) {
      accessories.push({
        text: {
          value: formatCurrencyCompact(totalBaseValue, baseCurrency),
          color: COLOR_NEGATIVE,
        },
        tooltip: `Debt value: ${formatCurrency(totalBaseValue, baseCurrency)} (subtracted from portfolio)`,
      });
    }
  } else if (hasPrice) {
    // Price / equity in native currency
    accessories.push({
      text: { value: formatCurrency(currentPrice, position.currency), color: COLOR_MUTED },
      tooltip: isProperty ? `Equity in ${position.currency}` : `Price per unit in ${position.currency}`,
    });

    // Change percentage (coloured tag)
    // Property: show "equityChange% / hpiChange%" with explanatory tooltip
    // Securities: show day change as before
    if (isProperty && hpiChangePercent !== undefined) {
      accessories.push({
        tag: {
          value: `${formatPercent(changePercent)} / ${formatPercent(hpiChangePercent)}`,
          color: changeColor,
        },
        tooltip: `Equity change / Market value change`,
      });
    } else {
      accessories.push({
        tag: {
          value: formatPercent(changePercent),
          color: changeColor,
        },
        tooltip: `Day change: ${formatPercent(changePercent)}`,
      });
    }

    // Total value / equity in base currency (rightmost = most prominent)
    accessories.push({
      text: { value: formatCurrencyCompact(totalBaseValue, baseCurrency), color: COLOR_PRIMARY },
      tooltip: isProperty
        ? `Equity: ${formatCurrency(totalBaseValue, baseCurrency)}`
        : `Total value: ${formatCurrency(totalBaseValue, baseCurrency)}`,
    });
  } else {
    accessories.push({
      text: { value: "No price", color: COLOR_MUTED },
      tooltip: "Price data not yet available",
    });
  }

  // Tooltip shows original name when the asset has been renamed
  // Build title with strikethrough for paid-off debts
  const effectiveDisplayName = displayName;
  const titleTooltip = isPaidOff
    ? "This debt has been paid off"
    : isRenamed
      ? `Original name: ${position.name}`
      : undefined;

  return (
    <List.Item
      id={position.id}
      icon={icon}
      title={{ value: effectiveDisplayName, tooltip: titleTooltip }}
      subtitle={subtitle}
      accessories={accessories}
      keywords={keywords}
      actions={actions}
    />
  );
}

// ──────────────────────────────────────────
// Detail Mode — Split-Pane Layout (with detail panel)
// ──────────────────────────────────────────

interface DetailModeProps {
  position: PositionValuation["position"];
  icon: Icon;
  typeLabel: string;
  isCash: boolean;
  isProperty: boolean;
  isDebt: boolean;
  isPaidOff: boolean;
  isArchived: boolean;
  hasPrice: boolean;
  currentPrice: number;
  totalNativeValue: number;
  totalBaseValue: number;
  change: number;
  changePercent: number;
  changeColor: Color;
  fxRate: number;
  isCrossCurrency: boolean;
  baseCurrency: string;
  displayName: string;
  isRenamed: boolean;
  hpiChangePercent?: number;
  keywords: string[];
  actions: React.JSX.Element;
}

/**
 * Renders the position with a detail panel on the right.
 *
 * **Securities list row:**
 * ```
 * [icon] Name
 *        VUSA.L · £72.45 · +1.25% · £3,622 total
 * ```
 *
 * **Cash list row:**
 * ```
 * [icon] Cash (GBP)
 *        GBP · £500.00
 * ```
 *
 * Detail panel (right side):
 * Securities: Asset Info, Price & Change, Holdings, Metadata
 * Cash: Asset Info, Balance, FX (if cross-currency), Metadata
 */
function renderDetailMode({
  position,
  icon,
  typeLabel,
  isCash,
  isProperty,
  isDebt,
  isPaidOff,
  isArchived,
  hasPrice,
  currentPrice,
  totalNativeValue,
  totalBaseValue,
  change,
  changePercent,
  changeColor,
  fxRate,
  isCrossCurrency,
  baseCurrency,
  displayName,
  isRenamed,
  hpiChangePercent,
  keywords,
  actions,
}: DetailModeProps): React.JSX.Element {
  // ── Subtitle ──
  // When detail is showing, accessories are hidden by Raycast.
  // Pack key financial info into the subtitle instead.

  let subtitle: string;

  if (isCash) {
    subtitle = `${position.currency} · ${formatCurrency(position.units, position.currency)}`;
  } else if (isDebt && position.debtData) {
    if (isPaidOff) {
      subtitle = typeLabel;
    } else {
      const subtitleParts = [typeLabel];
      subtitleParts.push(`${formatCurrency(currentPrice, position.currency)} owed`);
      subtitleParts.push(`${position.debtData.apr}% APR`);
      subtitle = subtitleParts.join(" · ");
    }
  } else if (isProperty) {
    const subtitleParts = [position.mortgageData?.postcode ?? position.symbol];
    subtitleParts.push(formatPercent(changePercent));
    subtitleParts.push(`${formatCurrencyCompact(totalBaseValue, baseCurrency)} equity`);
    subtitle = subtitleParts.join(" · ");
  } else {
    const subtitleParts = [position.symbol];
    if (hasPrice) {
      subtitleParts.push(formatCurrency(currentPrice, position.currency));
      subtitleParts.push(formatPercent(changePercent));
      subtitleParts.push(`${formatCurrencyCompact(totalBaseValue, baseCurrency)} total`);
    }
    subtitle = subtitleParts.join(" · ");
  }

  // ── Detail Panel ──

  const detail = isCash
    ? buildCashDetail({ position, typeLabel, totalNativeValue, totalBaseValue, fxRate, isCrossCurrency, baseCurrency })
    : isDebt && position.debtData
      ? buildDebtDetail({
          position,
          typeLabel,
          currentPrice,
          totalBaseValue,
          fxRate,
          isCrossCurrency,
          baseCurrency,
          isPaidOff,
          isArchived,
        })
      : isProperty
        ? buildPropertyDetail({
            position,
            typeLabel,
            totalBaseValue,
            fxRate,
            isCrossCurrency,
            baseCurrency,
            displayName,
            isRenamed,
            hpiChangePercent,
          })
        : buildSecuritiesDetail({
            position,
            typeLabel,
            hasPrice,
            currentPrice,
            totalNativeValue,
            totalBaseValue,
            change,
            changePercent,
            changeColor,
            fxRate,
            isCrossCurrency,
            baseCurrency,
            displayName,
            isRenamed,
          });

  return (
    <List.Item
      id={position.id}
      icon={icon}
      title={{
        value: displayName,
        tooltip: isPaidOff ? "This debt has been paid off" : isRenamed ? `Original name: ${position.name}` : undefined,
      }}
      subtitle={subtitle}
      keywords={keywords}
      detail={detail}
      actions={actions}
    />
  );
}

// ──────────────────────────────────────────
// Detail Panel Builders
// ──────────────────────────────────────────

/**
 * Builds the detail panel for a cash position.
 *
 * Shows: type tag, currency, balance, converted value (if cross-currency),
 * FX rate (if cross-currency), and date added.
 */
// ──────────────────────────────────────────
// Debt Detail Panel Builder
// ──────────────────────────────────────────

function buildDebtDetail({
  position,
  typeLabel,
  currentPrice,
  totalBaseValue,
  fxRate,
  isCrossCurrency,
  baseCurrency,
  isPaidOff,
  isArchived,
}: {
  position: PositionValuation["position"];
  typeLabel: string;
  currentPrice: number;
  totalBaseValue: number;
  fxRate: number;
  isCrossCurrency: boolean;
  baseCurrency: string;
  isPaidOff: boolean;
  isArchived: boolean;
}): React.JSX.Element {
  const debtData = position.debtData!;

  const displayName = getDisplayName(position);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {/* ── Name ── */}
          <List.Item.Detail.Metadata.Label title="Name" text={displayName} />
          <List.Item.Detail.Metadata.Separator />

          {/* ── Debt Info ── */}
          <List.Item.Detail.Metadata.Label title="Debt Type" text={typeLabel} />

          {/* ── Status (combined into one row if both present) ── */}
          {(isPaidOff || isArchived) && (
            <List.Item.Detail.Metadata.TagList title="Status">
              {isPaidOff && <List.Item.Detail.Metadata.TagList.Item text="☑️ Paid Off" color={COLOR_MUTED} />}
              {isArchived && <List.Item.Detail.Metadata.TagList.Item text="📦 Archived" color={COLOR_MUTED} />}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label
            title="Outstanding Balance"
            text={formatCurrency(currentPrice, position.currency)}
          />
          <List.Item.Detail.Metadata.Label title="APR" text={`${debtData.apr}%`} />
          <List.Item.Detail.Metadata.Separator />

          {/* ── Repayment Info ── */}
          <List.Item.Detail.Metadata.Label
            title="Monthly Repayment"
            text={formatCurrency(debtData.monthlyRepayment, position.currency)}
          />
          <List.Item.Detail.Metadata.Label
            title="Repayment Day"
            text={`${debtData.repaymentDayOfMonth}th of each month`}
          />
          <List.Item.Detail.Metadata.Separator />

          {/* ── Loan Progress (if applicable) ── */}
          {debtData.loanStartDate && debtData.loanEndDate && (
            <>
              <List.Item.Detail.Metadata.Label title="Loan Start" text={formatDate(debtData.loanStartDate)} />
              <List.Item.Detail.Metadata.Label title="Loan End" text={formatDate(debtData.loanEndDate)} />
              {debtData.totalTermMonths && (
                <List.Item.Detail.Metadata.Label title="Total Term" text={`${debtData.totalTermMonths} months`} />
              )}
              <List.Item.Detail.Metadata.Separator />
            </>
          )}

          {/* ── Value in Portfolio ── */}
          <List.Item.Detail.Metadata.TagList title="Portfolio Impact">
            <List.Item.Detail.Metadata.TagList.Item
              text={formatCurrency(totalBaseValue, baseCurrency)}
              color={isPaidOff ? COLOR_NEUTRAL : COLOR_NEGATIVE}
            />
          </List.Item.Detail.Metadata.TagList>

          {isCrossCurrency && (
            <List.Item.Detail.Metadata.Label
              title="FX Rate"
              text={`1 ${position.currency} = ${fxRate.toFixed(4)} ${baseCurrency}`}
            />
          )}

          <List.Item.Detail.Metadata.Separator />

          {/* ── Original Balance ── */}
          <List.Item.Detail.Metadata.Label
            title="Original Balance"
            text={formatCurrency(debtData.currentBalance, position.currency)}
          />
          <List.Item.Detail.Metadata.Label title="Entered" text={formatDate(debtData.enteredAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// ──────────────────────────────────────────
// Cash Detail Panel Builder
// ──────────────────────────────────────────

function buildCashDetail({
  position,
  typeLabel,
  totalNativeValue,
  totalBaseValue,
  fxRate,
  isCrossCurrency,
  baseCurrency,
}: {
  position: PositionValuation["position"];
  typeLabel: string;
  totalNativeValue: number;
  totalBaseValue: number;
  fxRate: number;
  isCrossCurrency: boolean;
  baseCurrency: string;
}): React.JSX.Element {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {/* ── Cash Info ── */}
          <List.Item.Detail.Metadata.Label title="Type" text={typeLabel} />
          <List.Item.Detail.Metadata.Label title="Currency" text={position.currency} />

          <List.Item.Detail.Metadata.Separator />

          {/* ── Balance ── */}
          <List.Item.Detail.Metadata.Label
            title={`Balance (${position.currency})`}
            text={formatCurrency(totalNativeValue, position.currency)}
          />

          {isCrossCurrency && (
            <>
              <List.Item.Detail.Metadata.Label
                title={`Value (${baseCurrency})`}
                text={formatCurrency(totalBaseValue, baseCurrency)}
              />
              <List.Item.Detail.Metadata.Label
                title="FX Rate"
                text={`1 ${position.currency} = ${fxRate.toFixed(4)} ${baseCurrency}`}
              />
            </>
          )}

          <List.Item.Detail.Metadata.Separator />

          {/* ── Metadata ── */}
          <List.Item.Detail.Metadata.Label title="Added" text={formatDate(position.addedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * Builds the detail panel for a property position (MORTGAGE or OWNED_PROPERTY).
 *
 * Shows: property name, type, postcode, valuation date, property value,
 * equity breakdown (original + principal repaid + appreciation), HPI change,
 * outstanding mortgage balance, and optional mortgage payment split.
 */
function buildPropertyDetail({
  position,
  typeLabel,
  totalBaseValue,
  fxRate,
  isCrossCurrency,
  baseCurrency,
  displayName,
  isRenamed,
  hpiChangePercent,
}: {
  position: PositionValuation["position"];
  typeLabel: string;
  totalBaseValue: number;
  fxRate: number;
  isCrossCurrency: boolean;
  baseCurrency: string;
  displayName: string;
  isRenamed: boolean;
  hpiChangePercent?: number;
}): React.JSX.Element {
  const md = position.mortgageData;

  // Use raw HPI for the mortgage calculator (not the equity-relative changePercent)
  const rawHPI = hpiChangePercent ?? 0;
  const equityCalc = md ? calculateCurrentEquity(md, rawHPI) : null;
  const piRatio = md ? getCurrentPrincipalInterestRatio(md) : null;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {/* ── Property Info ── */}
          <List.Item.Detail.Metadata.Label title="Property" text={displayName} />
          {isRenamed && (
            <List.Item.Detail.Metadata.TagList title="Original Name">
              <List.Item.Detail.Metadata.TagList.Item text={position.name} color={COLOR_MUTED} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item text={typeLabel} />
          </List.Item.Detail.Metadata.TagList>
          {md && <List.Item.Detail.Metadata.Label title="Postcode" text={md.postcode} />}

          <List.Item.Detail.Metadata.Separator />

          {/* ── Property Value & Equity ── */}
          {md && equityCalc && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Property Value (estimated)"
                text={formatCurrency(equityCalc.currentPropertyValue, position.currency)}
              />
              <List.Item.Detail.Metadata.Label
                title="Original Valuation"
                text={formatCurrency(md.totalPropertyValue, position.currency)}
              />
              <List.Item.Detail.Metadata.TagList title="HPI Change">
                <List.Item.Detail.Metadata.TagList.Item
                  text={formatPercent(rawHPI)}
                  color={rawHPI > 0 ? COLOR_POSITIVE : rawHPI < 0 ? COLOR_NEGATIVE : COLOR_NEUTRAL}
                />
              </List.Item.Detail.Metadata.TagList>

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Current Equity"
                text={formatCurrency(equityCalc.currentEquity, position.currency)}
              />
              <List.Item.Detail.Metadata.Label
                title="Original Equity"
                text={formatCurrency(equityCalc.originalEquity, position.currency)}
              />
              {equityCalc.principalRepaid > 0 && (
                <List.Item.Detail.Metadata.TagList title="Principal Repaid">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={`+${formatCurrency(equityCalc.principalRepaid, position.currency)}`}
                    color={COLOR_POSITIVE}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              {equityCalc.appreciation !== 0 && (
                <List.Item.Detail.Metadata.TagList title="Market Appreciation">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={formatCurrency(equityCalc.appreciation, position.currency, { showSign: true })}
                    color={equityCalc.appreciation > 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              {equityCalc.outstandingBalance > 0 && (
                <List.Item.Detail.Metadata.Label
                  title="Outstanding Mortgage"
                  text={formatCurrency(equityCalc.outstandingBalance, position.currency)}
                />
              )}

              {/* ── Shared Ownership Adjustment ── */}
              {equityCalc.sharedOwnershipPercent < 100 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Ownership Share"
                    text={`${equityCalc.sharedOwnershipPercent}%`}
                  />
                  {equityCalc.myEquityShare > 0 && (
                    <List.Item.Detail.Metadata.Label
                      title="My Share of Deposit"
                      text={formatCurrency(equityCalc.myEquityShare, position.currency)}
                    />
                  )}
                  <List.Item.Detail.Metadata.TagList title="Net Change">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={formatCurrency(equityCalc.netChange, position.currency, { showSign: true })}
                      color={
                        equityCalc.netChange > 0
                          ? COLOR_POSITIVE
                          : equityCalc.netChange < 0
                            ? COLOR_NEGATIVE
                            : COLOR_NEUTRAL
                      }
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="My Share of Change">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={formatCurrency(
                        (equityCalc.netChange * equityCalc.sharedOwnershipPercent) / 100,
                        position.currency,
                        { showSign: true },
                      )}
                      color={
                        equityCalc.netChange > 0
                          ? COLOR_POSITIVE
                          : equityCalc.netChange < 0
                            ? COLOR_NEGATIVE
                            : COLOR_NEUTRAL
                      }
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label
                    title="Your Equity"
                    text={formatCurrency(equityCalc.adjustedEquity, position.currency)}
                  />
                </>
              )}
            </>
          )}

          {/* ── FX Conversion (if cross-currency) ── */}
          {isCrossCurrency && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={`Equity (${baseCurrency})`}
                text={formatCurrency(totalBaseValue, baseCurrency)}
              />
              <List.Item.Detail.Metadata.Label
                title="FX Rate"
                text={`1 ${position.currency} = ${fxRate.toFixed(4)} ${baseCurrency}`}
              />
            </>
          )}

          {/* ── Mortgage Payment Split ── */}
          {piRatio && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Monthly Payment"
                text={formatCurrency(piRatio.monthlyPayment, position.currency)}
              />
              <List.Item.Detail.Metadata.Label
                title="Payment Split"
                text={`${piRatio.principalPercent.toFixed(0)}% principal · ${piRatio.interestPercent.toFixed(0)}% interest`}
              />
            </>
          )}

          <List.Item.Detail.Metadata.Separator />

          {/* ── Metadata ── */}
          <List.Item.Detail.Metadata.Label title="Currency" text={position.currency} />
          {md && <List.Item.Detail.Metadata.Label title="Valuation Date" text={formatDate(md.valuationDate)} />}
          <List.Item.Detail.Metadata.Label title="Added" text={formatDate(position.addedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * Builds the detail panel for a traded security (stock, ETF, fund, etc.).
 *
 * Shows: asset name, symbol, type tag, price, day change, units, native value,
 * converted value (if cross-currency), FX rate, currency, and date added.
 */
function buildSecuritiesDetail({
  position,
  typeLabel,
  hasPrice,
  currentPrice,
  totalNativeValue,
  totalBaseValue,
  change,
  changePercent,
  changeColor,
  fxRate,
  isCrossCurrency,
  baseCurrency,
  displayName,
  isRenamed,
}: {
  position: PositionValuation["position"];
  typeLabel: string;
  hasPrice: boolean;
  currentPrice: number;
  totalNativeValue: number;
  totalBaseValue: number;
  change: number;
  changePercent: number;
  changeColor: Color;
  fxRate: number;
  isCrossCurrency: boolean;
  baseCurrency: string;
  displayName: string;
  isRenamed: boolean;
}): React.JSX.Element {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {/* ── Asset Info ── */}
          <List.Item.Detail.Metadata.Label title="Asset" text={displayName} />
          {isRenamed && (
            <List.Item.Detail.Metadata.TagList title="Original Name">
              <List.Item.Detail.Metadata.TagList.Item text={position.name} color={COLOR_MUTED} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Symbol" text={position.symbol} />
          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item text={typeLabel} />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />

          {/* ── Price & Change ── */}
          {hasPrice ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="Current Price"
                text={formatCurrency(currentPrice, position.currency)}
              />
              <List.Item.Detail.Metadata.TagList title="Day Change">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${formatCurrency(change, position.currency, { showSign: true })} (${formatPercent(changePercent)})`}
                  color={changeColor}
                />
              </List.Item.Detail.Metadata.TagList>
            </>
          ) : (
            <List.Item.Detail.Metadata.TagList title="Price">
              <List.Item.Detail.Metadata.TagList.Item text="Unavailable" color={COLOR_MUTED} />
            </List.Item.Detail.Metadata.TagList>
          )}

          <List.Item.Detail.Metadata.Separator />

          {/* ── Holdings ── */}
          <List.Item.Detail.Metadata.Label title="Units Held" text={formatUnits(position.units)} />

          {hasPrice && (
            <>
              <List.Item.Detail.Metadata.Label
                title={`Value (${position.currency})`}
                text={formatCurrency(totalNativeValue, position.currency)}
              />

              {isCrossCurrency && (
                <>
                  <List.Item.Detail.Metadata.Label
                    title={`Value (${baseCurrency})`}
                    text={formatCurrency(totalBaseValue, baseCurrency)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="FX Rate"
                    text={`1 ${position.currency} = ${fxRate.toFixed(4)} ${baseCurrency}`}
                  />
                </>
              )}
            </>
          )}

          <List.Item.Detail.Metadata.Separator />

          {/* ── Metadata ── */}
          <List.Item.Detail.Metadata.Label title="Currency" text={position.currency} />
          <List.Item.Detail.Metadata.Label title="Added" text={formatDate(position.addedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
