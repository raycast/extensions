import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { roundAmount } from "../../services/format";
import { TimeRange } from "../../services/statement";
import {
  BudgetMonth,
  BudgetProgress,
  formatAmount,
  formatBudgetPercentage,
  formatDateRange,
  formatHryvnias,
  formatSpentOfLimit,
  formatSyncTime,
  getAmountColor,
  getBudgetAlert,
  getBudgetColor,
  getBudgetIcon,
  isSyncedToday,
  StatementSummary,
} from "../../utils";
import StatementActionsSection, { StatementActionsProps } from "./StatementActionsSection";

const { Metadata } = List.Item.Detail;

/**
 * Totals of the loaded transactions, with budgets and spending by category in the detail panel.
 * While searching, `summary` covers only the matching transactions, but budgets still cover the whole month.
 */
export default function SummaryListItem(props: {
  summary: StatementSummary;
  periodLabel: string;
  /** The trimmed search text; empty when not searching. */
  searchText: string;
  /** The number of loaded transactions, matching the search or not. */
  totalCount: number;
  /** Empty when there are no budgets or the period isn't a budget month. */
  budgetProgress: BudgetProgress[];
  budgetMonth?: BudgetMonth;
  /** How many cards budgets count, this one included. */
  budgetCardCount: number;
  /** Unix milliseconds of the least recent sync among the other budget cards, if there are any. */
  otherCardsSyncedAt?: number;
  /** The newest part of the period that isn't loaded on this card, so the totals don't cover it. */
  missing?: TimeRange;
  /** Whether the month has transactions that aren't loaded on another budget card, so budgets may be undercounted. */
  isOtherCardsPartial: boolean;
  statement: StatementActionsProps;
}) {
  const {
    summary,
    periodLabel,
    searchText,
    totalCount,
    budgetProgress,
    budgetMonth,
    budgetCardCount,
    otherCardsSyncedAt,
    missing,
    isOtherCardsPartial,
    statement,
  } = props;
  const { currency } = summary;
  if (!currency) return null;

  const income = formatAmount(summary.income, currency, { signed: true });
  // Negated only when not zero, so nothing spent shows "0" rather than "-0".
  const spent = formatAmount(summary.expenses ? -summary.expenses : 0, currency);
  const saved = formatAmount(summary.savings ? -summary.savings : 0, currency);
  // Savings leave the card too, so net is how much the balance changed. Rounded, so a float leftover isn't colored.
  const netAmount = roundAmount(summary.income - summary.expenses - summary.savings, currency);
  const net = formatAmount(netAmount, currency, { signed: true });
  const cashback = formatAmount(summary.cashback, currency);
  const subscriptions = `${formatAmount(summary.subscriptions.amount, currency)} (${summary.subscriptions.count})`;
  const count = summary.holdCount ? `${summary.count} (${summary.holdCount} on hold)` : `${summary.count}`;
  const isSearching = searchText.length > 0;
  const budgetAlert = getBudgetAlert(budgetProgress);
  const budgetCards = budgetCardCount === 1 ? "" : ` · ${budgetCardCount} cards`;
  const notLoaded = missing && `Not loaded: ${formatDateRange(missing.from, missing.to)}`;
  const otherCardsUpdated =
    otherCardsSyncedAt !== undefined && !isSyncedToday(otherCardsSyncedAt)
      ? formatSyncTime(otherCardsSyncedAt)
      : undefined;

  return (
    <List.Item
      id="summary"
      icon={{ source: Icon.PieChart, tintColor: Color.Blue }}
      title="Summary"
      subtitle={
        isSearching && !summary.count
          ? "No matching transactions"
          : `Income ${income} · Spent ${spent}${summary.savings ? ` · Saved ${saved}` : ""}`
      }
      accessories={[
        ...(budgetAlert
          ? [
              {
                icon: { source: Icon.ExclamationMark, tintColor: getBudgetColor(budgetAlert.status) },
                tooltip: budgetAlert.text,
              },
            ]
          : []),
        ...(notLoaded ? [{ icon: { source: Icon.Warning, tintColor: Color.Orange }, tooltip: notLoaded }] : []),
        { text: isSearching ? `${summary.count} of ${totalCount} transactions` : `${totalCount} transactions` },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            // Keys include the text: Raycast doesn't resize a label whose text changes in place,
            // so a new key makes it recreate the label instead of truncating the new value.
            <Metadata>
              <Metadata.Label key={`period:${periodLabel}`} title="Period" text={periodLabel} />
              {isSearching && <Metadata.Label key={`search:${searchText}`} title="Search" text={searchText} />}
              <Metadata.Label key={`income:${income}`} title="Income" text={{ value: income, color: Color.Green }} />
              <Metadata.Label
                key={`spent:${spent}`}
                title="Spent"
                text={{ value: spent, color: summary.expenses ? Color.Red : undefined }}
              />
              {summary.subscriptions.count > 0 && (
                // Part of Spent: charges with the Subscription tag.
                <Metadata.Label
                  key={`subscriptions:${subscriptions}`}
                  title="Subscriptions"
                  icon={Icon.Repeat}
                  text={subscriptions}
                />
              )}
              {summary.savings !== 0 && <Metadata.Label key={`saved:${saved}`} title="Saved" text={saved} />}
              <Metadata.Label key={`net:${net}`} title="Net" text={{ value: net, color: getAmountColor(netAmount) }} />
              {summary.cashback !== 0 && (
                <Metadata.Label key={`cashback:${cashback}`} title="Cashback" text={cashback} />
              )}
              <Metadata.Label key={`count:${count}`} title="Transactions" text={count} />
              {notLoaded && (
                <Metadata.Label
                  key={`partial:${notLoaded}`}
                  title="Partial"
                  text={{ value: notLoaded, color: Color.Orange }}
                />
              )}

              {budgetMonth && budgetProgress.length > 0 && (
                <>
                  <Metadata.Separator />
                  <Metadata.Label
                    key={`budgets:${budgetMonth.label}:${budgetCards}:${isSearching}`}
                    title={`Budgets · ${budgetMonth.label}${budgetCards}${isSearching ? " (whole month)" : ""}`}
                  />
                  {isOtherCardsPartial && (
                    <Metadata.Label title="Partial" text="Other cards: older transactions not loaded" />
                  )}
                  {otherCardsUpdated && (
                    <Metadata.Label
                      key={`otherCards:${otherCardsUpdated}`}
                      title="Other Cards"
                      text={otherCardsUpdated}
                    />
                  )}
                  {budgetProgress.map((progress) => (
                    <BudgetLabels key={progress.budget.id} progress={progress} isCurrentMonth={budgetMonth.isCurrent} />
                  ))}
                </>
              )}

              {summary.categories.length > 0 && (
                <>
                  <Metadata.Separator />
                  <Metadata.Label title="Spending by Category" />
                  {summary.categories.map((category) => {
                    const text = `${formatAmount(category.amount, currency)} (${category.count})`;
                    return (
                      <Metadata.Label
                        key={`${category.name}:${text}`}
                        title={category.name}
                        icon={category.icon}
                        text={text}
                      />
                    );
                  })}
                </>
              )}
            </Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <StatementActionsSection {...statement} actionsBefore={0} />
        </ActionPanel>
      }
    />
  );
}

/** A budget's spending of its limit and, for the current month, what's left per day; or how much it's over by. */
function BudgetLabels(props: { progress: BudgetProgress; isCurrentMonth: boolean }) {
  const { progress, isCurrentMonth } = props;
  const color = getBudgetColor(progress.status);
  const text = `${formatSpentOfLimit(progress)} · ${formatBudgetPercentage(progress)}`;

  let pace: { title: string; text: string } | undefined;
  if (progress.left < 0) {
    pace = { title: "Over by", text: formatHryvnias(-progress.left) };
  } else if (isCurrentMonth) {
    const perDay = progress.perDayLeft !== undefined ? ` · ≈ ${formatHryvnias(progress.perDayLeft)}/day` : "";
    pace = { title: "Left", text: `${formatHryvnias(progress.left)}${perDay}` };
  }

  return (
    <>
      <Metadata.Label
        key={`${progress.budget.id}:${progress.budget.name}:${text}`}
        icon={getBudgetIcon(progress)}
        title={progress.budget.name}
        text={{ value: text, color }}
      />
      {pace && (
        <Metadata.Label
          key={`${progress.budget.id}:pace:${pace.title}:${pace.text}`}
          title={pace.title}
          text={{ value: pace.text, color: progress.left < 0 ? color : undefined }}
        />
      )}
    </>
  );
}
