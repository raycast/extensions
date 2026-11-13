/** A monthly spending limit for some categories, counted on the UAH account being viewed. */
export interface Budget {
  id: string;
  name: string;
  /**
   * English category names from `mcc.json`, e.g. "Cafe. Restaurants". Names, not codes, so one entry covers every
   * code that shares a name (all hotel chains, for example).
   */
  categories: string[];
  /** In UAH, major units (like `Transaction.amount`). */
  limit: number;
}
