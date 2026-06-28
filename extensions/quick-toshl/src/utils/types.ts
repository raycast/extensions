export interface Category {
  id: string;
  name: string;
  type: "expense" | "income" | "system";
  deleted: boolean;
  modified?: string;
}

export interface Tag {
  id: string;
  name: string;
  type: "expense" | "income";
  category: string;
  deleted: boolean;
  modified?: string;
}

export interface Currency {
  code: string;
  rate?: number;
  fixed?: boolean;
  name?: string;
  symbol?: string;
  precision?: number;
  modified?: string;
  type?: string;
}

export interface Account {
  id: string;
  name: string;
  order: number;
  currency: {
    code: string;
    rate?: number;
    main_rate?: number;
    fixed?: boolean;
  };
  modified?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: {
    code: string;
    rate?: number;
    main_rate?: number;
    fixed?: boolean;
  };
  date: string;
  desc: string;
  account: string;
  category: string;
  tags: string[];
  modified: string;
  completed: boolean;
  deleted: boolean;
  repeat?: {
    id: string;
    frequency: string;
    interval: number;
    start: string;
    end?: string;
    count?: number;
  };
  // For transfers: linked transaction to another account
  transaction?: {
    id?: string;
    account: string;
    currency?: {
      code: string;
      rate?: number;
      main_rate?: number;
      fixed?: boolean;
    };
  };
  /** Private extension field from Toshl API */
  extra?: Record<string, unknown>;
  /** Place / venue (see Toshl entries API). */
  location?: {
    id?: string;
    venue_id?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface TransactionInput {
  amount: number;
  currency: {
    code: string;
    rate?: number;
    fixed?: boolean;
  };
  date: string;
  desc?: string;
  account?: string;
  category?: string;
  tags?: string[];
  repeat?: RepeatInput;
  modified?: string; // Required for updates
  completed?: boolean;
  extra?: Record<string, unknown>;
  location?: {
    id?: string;
    venue_id?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface TransferInput {
  amount: number;
  currency: {
    code: string;
    rate?: number;
    fixed?: boolean;
  };
  date: string;
  desc?: string;
  account: string;
  transaction: {
    id?: string;
    account: string;
    currency: {
      code: string;
      rate?: number;
      fixed?: boolean;
    };
  };
  modified?: string;
  repeat?: Transaction["repeat"];
}

export interface RepeatInput {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  start: string;
  end?: string;
  count?: number;
}

export interface Budget {
  id: string;
  name: string;
  limit: number;
  amount: number;
  planned: number;
  currency: {
    code: string;
    rate?: number;
    fixed?: boolean;
  };
  from: string;
  to: string;
  rollover: boolean;
  rollover_amount?: number;
  modified: string;
  recurrence?: {
    frequency: string;
    interval: number;
    start: string;
    iteration: number;
  };
  status: "active" | "inactive" | "archived";
  type: "regular" | "delta" | "percent";
  percent?: number;
  delta?: number;
  order: number;
  categories?: string[];
  tags?: string[];
  accounts?: string[];
  deleted?: boolean;
}

export interface PlanningItem {
  sum: number;
  planned: number;
  predicted: number;
}

export interface PlanningPeriod {
  from: string;
  to: string;
  expenses: PlanningItem;
  incomes: PlanningItem;
  balance: PlanningItem;
  estimated?: PlanningItem;
}

export interface Planning {
  avg: {
    expenses: number;
    incomes: number;
    balance: number;
    networth: number;
  };
  ranges: {
    expenses: { min: number; max: number };
    incomes: { min: number; max: number };
    balance: { min: number; max: number };
    networth: { min: number; max: number };
  };
  planning: PlanningPeriod[];
}

/** POST /categories */
export interface CategoryCreateInput {
  name: string;
  type: "expense" | "income";
  extra?: Record<string, unknown>;
}

/** PUT /categories/{id} */
export interface CategoryUpdateInput {
  id: string;
  name: string;
  type: "expense" | "income";
  modified: string;
  extra?: Record<string, unknown>;
}

/** POST /tags */
export interface TagCreateInput {
  name: string;
  type: "expense" | "income";
  category?: string;
  extra?: Record<string, unknown>;
}

/** PUT /tags/{id} */
export interface TagUpdateInput {
  id: string;
  name: string;
  type: "expense" | "income";
  category?: string;
  modified: string;
  extra?: Record<string, unknown>;
}

/** POST /accounts */
export interface AccountCreateInput {
  name: string;
  currency: { code: string; rate?: number; fixed?: boolean };
  type?: string;
  initial_balance?: number;
  parent?: string;
  extra?: Record<string, unknown>;
}

/** PUT /accounts/{id} — send fields you change plus required ids/modified per API */
export interface AccountUpdateInput {
  id: string;
  name: string;
  modified: string;
  currency?: { code: string; rate?: number; fixed?: boolean };
  initial_balance?: number;
  order?: number;
  limit?: number;
  extra?: Record<string, unknown>;
}

/** POST /budgets */
export interface BudgetCreateInput {
  name: string;
  limit: number;
  type: "regular" | "delta" | "percent";
  currency: { code: string; rate?: number; fixed?: boolean };
  rollover?: boolean;
  recurrence?: {
    frequency: string;
    interval: number;
    start: string;
    end?: string;
    byday?: string;
    bymonthday?: string;
    bysetpos?: string;
  };
  percent?: number;
  delta?: number;
  categories?: string[];
  tags?: string[];
  accounts?: string[];
  "!categories"?: string[];
  "!tags"?: string[];
  "!accounts"?: string[];
  extra?: Record<string, unknown>;
}

/** PUT /budgets/{id} */
export interface BudgetUpdateInput {
  id: string;
  name: string;
  limit: number;
  type: "regular" | "delta" | "percent";
  currency: { code: string; rate?: number; fixed?: boolean };
  modified: string;
  rollover?: boolean;
  rollover_amount?: number;
  rollover_override?: boolean;
  percent?: number;
  delta?: number;
  categories?: string[];
  tags?: string[];
  accounts?: string[];
  "!categories"?: string[];
  "!tags"?: string[];
  "!accounts"?: string[];
  extra?: Record<string, unknown>;
}
