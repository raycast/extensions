import type {
  TransactionDetail as ynabTransactionDetail,
  Account as ynabAccount,
  CurrencyFormat as ynabCurrencyFormat,
  Category as ynabCategory,
  CategoryGroupWithCategories as ynabCategoryGroupWithCategories,
  BudgetDetail as ynabBudgetDetail,
} from 'ynab';

export interface Preferences {
  apiToken: string;
}

export type TransactionDetail = ynabTransactionDetail;
export type TransactionDetailMap = Map<string, Group<TransactionDetail>>;

export type Account = ynabAccount;
export type Category = ynabCategory;
export type CategoryGroupWithCategories = ynabCategoryGroupWithCategories;
export type BudgetDetail = ynabBudgetDetail;
export type BudgetDetailSummary = Pick<BudgetDetail, 'months' | 'currency_format'>;

export type GroupTypes = 'category' | 'payee' | 'account';
export type GroupNames = `${GroupTypes}_name`;

export type FilterTypes = 'category' | 'account';
export type FilterNames = `${FilterTypes}_name` | 'amount';

export type SortTypes = 'amount' | 'date';
export type sortOrder = 'asc' | 'desc';
export type SortNames = `${SortTypes}_${sortOrder}`;

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type FlagColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export type CurrencyFormat = ynabCurrencyFormat | null | undefined;

export interface BudgetSummary {
  id: string;
  name: string;
  last_modified_on?: string | null;
  currency_format: CurrencyFormat;
}
export interface Group<T> {
  id: string;
  title: string;
  items: T[];
}

export type Filter = {
  key: FilterNames;
  value?: string;
} | null;

export type onGroupType = (groupType: GroupNames) => () => void;
export type onFilterType = (filterType: Filter) => () => void;
export type onSortType = (sortType: SortNames) => () => void;
export type onTimelineType = (period: Period) => void;

export interface ViewState {
  filter: Filter;
  search: string;
  group: GroupNames | null;
  sort: SortNames | null;
  collection: TransactionDetail[] | TransactionDetailMap;
  initialCollection: TransactionDetail[];
}

export type ViewAction =
  | { type: 'reset'; initialCollection?: TransactionDetail[] }
  | {
      type: 'filter';
      filterBy: Filter;
    }
  | { type: 'search'; query: string }
  | { type: 'group'; groupBy: GroupNames }
  | { type: 'sort'; sortBy: SortNames };

export type TransactionState = Omit<ViewState, 'collection' | 'initialCollection'> & {
  timeline: Period | undefined;
};
