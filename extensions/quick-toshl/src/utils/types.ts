export interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  deleted: boolean;
}

export interface Tag {
  id: string;
  name: string;
  type: "expense" | "income";
  category: string;
  deleted: boolean;
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
    account: string;
    currency?: {
      code: string;
    };
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
}

export interface TransferInput {
  amount: number;
  currency: {
    code: string;
  };
  date: string;
  desc?: string;
  account: string;
  transaction: {
    account: string;
    currency: {
      code: string;
    };
  };
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
