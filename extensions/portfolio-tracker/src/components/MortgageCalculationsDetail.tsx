/**
 * MortgageCalculationsDetail component.
 *
 * A Raycast Detail view that shows the full equity calculation breakdown
 * for a property position. Displays the formula, actual numbers, and a
 * step-by-step walkthrough of how the user's equity is computed.
 *
 * Accessible via the "Show Calculations" action on property positions.
 *
 * Sections:
 * 1. 🏠 Property Overview — original valuation and current estimate
 * 2. 🏦 Mortgage — outstanding balance and principal repaid
 * 3. 📈 Market Impact — HPI change applied to full property value
 * 4. 📊 Net Change — principal repaid + market appreciation
 * 5. 👥 Shared Ownership — ownership split applied to net change
 * 6. 💰 Final Equity — the user's bottom-line equity figure
 *
 * Usage:
 * ```tsx
 * <MortgageCalculationsDetail
 *   position={position}
 *   hpiChangePercent={-5.1}
 *   baseCurrency="GBP"
 *   onDone={() => pop()}
 * />
 * ```
 */

import React from "react";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Position, hasMortgageRepaymentData } from "../utils/types";
import {
  calculateCurrentEquity,
  getCurrentPrincipalInterestRatio,
  EquityCalculation,
} from "../services/mortgage-calculator";
import { formatCurrency, formatPercent, getDisplayName } from "../utils/formatting";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface MortgageCalculationsDetailProps {
  /** The property position to show calculations for */
  position: Position;

  /** Raw HPI percentage change since valuation */
  hpiChangePercent: number;

  /** User's base currency code */
  baseCurrency: string;

  /** Callback to navigate back */
  onDone: () => void;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function MortgageCalculationsDetail({
  position,
  hpiChangePercent,
  baseCurrency,
  onDone,
}: MortgageCalculationsDetailProps): React.JSX.Element {
  const md = position.mortgageData;
  const displayName = getDisplayName(position);
  const currency = position.currency || baseCurrency;

  if (!md) {
    return (
      <Detail
        navigationTitle="Calculations"
        markdown="# ⚠️ No Mortgage Data\n\nThis position does not have mortgage data configured."
        actions={
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onDone} />
          </ActionPanel>
        }
      />
    );
  }

  const calc = calculateCurrentEquity(md, hpiChangePercent);
  const piRatio = getCurrentPrincipalInterestRatio(md);
  const hasRepaymentData = hasMortgageRepaymentData(md);
  const hasSharedOwnership = calc.sharedOwnershipPercent < 100;
  const hasMyEquityShare = calc.myEquityShare > 0;

  const markdown = buildMarkdown({
    displayName,
    currency,
    md,
    calc,
    piRatio,
    hpiChangePercent,
    hasRepaymentData,
    hasSharedOwnership,
    hasMyEquityShare,
  });

  return (
    <Detail
      navigationTitle={`Calculations — ${displayName}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={onDone} />
          <Action.CopyToClipboard
            title="Copy Calculations"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ──────────────────────────────────────────
// Markdown Builder
// ──────────────────────────────────────────

function buildMarkdown({
  displayName,
  currency,
  md,
  calc,
  piRatio,
  hpiChangePercent,
  hasRepaymentData,
  hasSharedOwnership,
  hasMyEquityShare,
}: {
  displayName: string;
  currency: string;
  md: NonNullable<Position["mortgageData"]>;
  calc: EquityCalculation;
  piRatio: ReturnType<typeof getCurrentPrincipalInterestRatio>;
  hpiChangePercent: number;
  hasRepaymentData: boolean;
  hasSharedOwnership: boolean;
  hasMyEquityShare: boolean;
}): string {
  const f = (n: number, opts?: { showSign?: boolean }) => formatCurrency(n, currency, opts);
  const pct = (n: number) => formatPercent(n);
  const sign = (n: number) => (n >= 0 ? "📈" : "📉");
  const changeEmoji = (n: number) => (n > 0 ? "🟢" : n < 0 ? "🔴" : "⚪");

  const originalMortgage = md.totalPropertyValue - md.equity;
  const lines: string[] = [];

  // ── Title ──
  lines.push(`# 🧮 Equity Calculation`);
  lines.push(`### ${displayName}`);
  lines.push(``);

  // ── Step 1: Property Value ──
  lines.push(`---`);
  lines.push(`## 🏠 Step 1 — Property Value`);
  lines.push(``);
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| Original Valuation | **${f(md.totalPropertyValue)}** |`);
  lines.push(`| HPI Change | ${sign(hpiChangePercent)} **${pct(hpiChangePercent)}** |`);
  lines.push(`| Current Estimate | **${f(calc.currentPropertyValue)}** |`);
  lines.push(``);
  lines.push(
    `> *${f(md.totalPropertyValue)} × (1 + ${(hpiChangePercent / 100).toFixed(4)}) = ${f(calc.currentPropertyValue)}*`,
  );
  lines.push(``);

  // ── Step 2: Mortgage ──
  lines.push(`---`);
  lines.push(`## 🏦 Step 2 — Mortgage`);
  lines.push(``);
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| Original Mortgage | **${f(originalMortgage)}** |`);
  lines.push(`| Original Deposit | **${f(md.equity)}** |`);

  if (hasRepaymentData) {
    lines.push(`| Principal Repaid | 🟢 **${f(calc.principalRepaid)}** |`);
    lines.push(`| Outstanding Balance | **${f(calc.outstandingBalance)}** |`);
    lines.push(``);
    lines.push(`> *${f(originalMortgage)} − ${f(calc.principalRepaid)} = ${f(calc.outstandingBalance)} remaining*`);

    if (piRatio) {
      lines.push(``);
      lines.push(
        `Monthly payment: **${f(piRatio.monthlyPayment)}** (${piRatio.principalPercent.toFixed(0)}% principal · ${piRatio.interestPercent.toFixed(0)}% interest)`,
      );
    }

    if (md.mortgageRate !== undefined && md.mortgageTerm !== undefined) {
      lines.push(``);
      lines.push(`*Rate: ${md.mortgageRate}% · Term: ${md.mortgageTerm} years*`);
    }
  } else {
    lines.push(`| Outstanding Balance | **${f(calc.outstandingBalance)}** |`);
    lines.push(``);
    lines.push(`> *No repayment tracking data provided — principal repayment not calculated.*`);
  }
  lines.push(``);

  // ── Step 3: Market Impact ──
  lines.push(`---`);
  lines.push(`## ${sign(calc.appreciation)} Step 3 — Market Impact`);
  lines.push(``);
  lines.push(`The HPI percentage change is applied to the **full property value**, not just equity.`);
  lines.push(``);
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| Property Value | ${f(md.totalPropertyValue)} |`);
  lines.push(`| HPI Change | ${pct(hpiChangePercent)} |`);
  lines.push(`| Market Impact | ${changeEmoji(calc.appreciation)} **${f(calc.appreciation, { showSign: true })}** |`);
  lines.push(``);
  lines.push(
    `> *${f(md.totalPropertyValue)} × ${(hpiChangePercent / 100).toFixed(4)} = ${f(calc.appreciation, { showSign: true })}*`,
  );
  lines.push(``);

  // ── Step 4: Net Change ──
  lines.push(`---`);
  lines.push(`## 📊 Step 4 — Net Change`);
  lines.push(``);
  lines.push(`Net change combines principal repaid and market impact.`);
  lines.push(``);
  lines.push(`| Component | Amount |`);
  lines.push(`|---|---|`);
  if (hasRepaymentData) {
    lines.push(`| Principal Repaid | ${f(calc.principalRepaid, { showSign: true })} |`);
  }
  lines.push(`| Market Impact | ${f(calc.appreciation, { showSign: true })} |`);
  lines.push(`| **Net Change** | ${changeEmoji(calc.netChange)} **${f(calc.netChange, { showSign: true })}** |`);
  lines.push(``);
  if (hasRepaymentData) {
    lines.push(
      `> *${f(calc.principalRepaid)} + (${f(calc.appreciation, { showSign: true })}) = ${f(calc.netChange, { showSign: true })}*`,
    );
  }
  lines.push(``);

  // ── Step 5: Full Equity (before shared ownership) ──
  lines.push(`---`);
  lines.push(`## 💎 Step 5 — Full Equity (All Partners)`);
  lines.push(``);
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| Original Equity | ${f(md.equity)} |`);
  lines.push(`| Net Change | ${f(calc.netChange, { showSign: true })} |`);
  lines.push(`| **Current Equity** | **${f(calc.currentEquity)}** |`);
  lines.push(``);
  lines.push(`> *${f(md.equity)} + (${f(calc.netChange, { showSign: true })}) = ${f(calc.currentEquity)}*`);
  lines.push(``);
  lines.push(
    `*Or equivalently: ${f(calc.currentPropertyValue)} − ${f(calc.outstandingBalance)} = ${f(calc.currentEquity)}*`,
  );
  lines.push(``);

  // ── Step 6: Shared Ownership ──
  if (hasSharedOwnership) {
    const myShareOfChange = (calc.netChange * calc.sharedOwnershipPercent) / 100;

    lines.push(`---`);
    lines.push(`## 👥 Step 6 — Shared Ownership (${calc.sharedOwnershipPercent}%)`);
    lines.push(``);

    if (hasMyEquityShare) {
      lines.push(`The ownership ratio applies only to the **net change**, not to your deposit share.`);
      lines.push(``);
      lines.push(`| | |`);
      lines.push(`|---|---|`);
      lines.push(`| My Share of Deposit | **${f(calc.myEquityShare)}** |`);
      lines.push(`| Net Change | ${f(calc.netChange, { showSign: true })} |`);
      lines.push(`| Ownership Share | ${calc.sharedOwnershipPercent}% |`);
      lines.push(
        `| My Share of Change | ${changeEmoji(myShareOfChange)} **${f(myShareOfChange, { showSign: true })}** |`,
      );
      lines.push(``);
      lines.push(
        `> *${f(calc.netChange, { showSign: true })} × ${calc.sharedOwnershipPercent}% = ${f(myShareOfChange, { showSign: true })}*`,
      );
    } else {
      lines.push(`The ownership ratio applies to the full equity.`);
      lines.push(``);
      lines.push(`| | |`);
      lines.push(`|---|---|`);
      lines.push(`| Full Equity | ${f(calc.currentEquity)} |`);
      lines.push(`| Ownership Share | ${calc.sharedOwnershipPercent}% |`);
      lines.push(`| Your Equity | **${f(calc.adjustedEquity)}** |`);
      lines.push(``);
      lines.push(`> *${f(calc.currentEquity)} × ${calc.sharedOwnershipPercent}% = ${f(calc.adjustedEquity)}*`);
    }
    lines.push(``);
  }

  // ── Final Result ──
  lines.push(`---`);
  lines.push(`## 💰 Result — Your Equity`);
  lines.push(``);

  if (hasSharedOwnership && hasMyEquityShare) {
    const myShareOfChange = (calc.netChange * calc.sharedOwnershipPercent) / 100;
    lines.push(`| | |`);
    lines.push(`|---|---|`);
    lines.push(`| My Share of Deposit | ${f(calc.myEquityShare)} |`);
    lines.push(`| + My Share of Change | ${f(myShareOfChange, { showSign: true })} |`);
    lines.push(`| **= My Equity** | **${f(calc.adjustedEquity)}** |`);
    lines.push(``);
    lines.push(
      `> *${f(calc.myEquityShare)} + ${f(myShareOfChange, { showSign: true })} = **${f(calc.adjustedEquity)}***`,
    );
  } else if (hasSharedOwnership) {
    lines.push(`| | |`);
    lines.push(`|---|---|`);
    lines.push(`| Full Equity | ${f(calc.currentEquity)} |`);
    lines.push(`| × Ownership | ${calc.sharedOwnershipPercent}% |`);
    lines.push(`| **= My Equity** | **${f(calc.adjustedEquity)}** |`);
  } else {
    lines.push(`| | |`);
    lines.push(`|---|---|`);
    lines.push(`| Original Deposit | ${f(md.equity)} |`);
    lines.push(`| + Net Change | ${f(calc.netChange, { showSign: true })} |`);
    lines.push(`| **= Current Equity** | **${f(calc.currentEquity)}** |`);
  }
  lines.push(``);

  // ── Equity Change ──
  const baseEquity = hasSharedOwnership ? calc.adjustedOriginalEquity : md.equity;
  const finalEquity = hasSharedOwnership ? calc.adjustedEquity : calc.currentEquity;
  const equityChange = finalEquity - baseEquity;
  const equityChangePct = baseEquity > 0 ? (equityChange / baseEquity) * 100 : 0;

  lines.push(
    `${changeEmoji(equityChange)} **Equity change: ${f(equityChange, { showSign: true })} (${pct(equityChangePct)})** since valuation`,
  );
  lines.push(``);

  // ── Formula Summary ──
  lines.push(`---`);
  lines.push(`### 📐 Formula`);
  lines.push(``);
  if (hasSharedOwnership && hasMyEquityShare) {
    lines.push("```");
    lines.push(`Net Change    = Principal Repaid + Market Impact`);
    lines.push(`My Change     = Net Change × Ownership %`);
    lines.push(`My Equity     = My Deposit Share + My Change`);
    lines.push("```");
  } else if (hasSharedOwnership) {
    lines.push("```");
    lines.push(`Full Equity   = Property Value − Outstanding Mortgage`);
    lines.push(`My Equity     = Full Equity × Ownership %`);
    lines.push("```");
  } else {
    lines.push("```");
    lines.push(`Current Value = Original Value × (1 + HPI%)`);
    lines.push(`Equity        = Current Value − Outstanding Mortgage`);
    lines.push("```");
  }
  lines.push(``);

  // ── Postcode & Data Source ──
  lines.push(`---`);
  lines.push(`*Postcode: ${md.postcode} · Valuation: ${md.valuationDate} · HPI: ${pct(hpiChangePercent)}*`);
  lines.push(`*Source: UK Land Registry House Price Index*`);

  return lines.join("\n");
}
