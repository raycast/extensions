import { Image } from "@raycast/api";
import { useStatistics } from "../../hooks";
import { CountedTransaction, Period, StatisticsViewId } from "../../types";
import { getBudgetMonth, resolvePeriod } from "../../utils";
import CountedTransactionsList from "../statement/CountedTransactionsList";

const NO_ENTRIES: CountedTransaction[] = [];

/**
 * The transactions a row of "Show Statistics" counts: a category, a jar, or the card money went to, hidden or not.
 * They're the row's own in `getStatistics`, for the same period and accounts, so they add up to its amount.
 *
 * `accountIds` are the accounts switched on when the view was opened. Nothing is requested here: "Show Statistics"
 * stays mounted underneath and keeps the statements up to date, and this reads them again as they're stored.
 */
export default function StatisticsTransactionsView(props: {
  view: StatisticsViewId;
  rowKey: string;
  /** The row's title and icon, for until it's loaded. */
  title: string;
  icon: Image.ImageLike;
  period: Period;
  accountIds: string[];
}) {
  const { view, rowKey, title, icon, period, accountIds } = props;
  const { statistics, sync, isLoading } = useStatistics(period, { accountIds, sync: false });
  const row = statistics.rows[view].find((row) => row.key === rowKey);
  const periodLabel = getBudgetMonth(period)?.label ?? resolvePeriod(period).label;

  return (
    <CountedTransactionsList
      navigationTitle={`${title} · ${periodLabel}`}
      isLoading={isLoading}
      title={row?.title ?? title}
      icon={icon}
      entries={row?.transactions ?? NO_ENTRIES}
      isApproximate={statistics.isApproximate}
      note={sync.isPartial ? "Partial: older transactions not loaded" : undefined}
      emptyDescription={`${title} · ${periodLabel}`}
    />
  );
}
