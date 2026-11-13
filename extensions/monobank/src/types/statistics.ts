/** What "Show Statistics" charts: spending, income, top-ups of the user's jars, or transfers between their accounts. */
export type StatisticsViewId = "expenses" | "income" | "savings" | "ownTransfers";

/** What "Show Statistics" counts, as the user left it. */
export interface StatisticsFilters {
  /** The ids of the switched-on accounts, or nothing to count the default ones (personal UAH cards). */
  accountIds?: string[];
  /** The keys of the switched-off rows of each view. Rows are on unless listed, so a new category shows. */
  excluded: Partial<Record<StatisticsViewId, string[]>>;
}
