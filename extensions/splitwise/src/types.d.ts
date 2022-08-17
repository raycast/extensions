declare module "splitwise" {
  export enum GroupType {
    APARTMENT = "apartment",
    HOUSE = "house",
    TRIP = "trip",
    Other = "other",
  }

  export type User = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    registration_status: "confirmed" | "dummy" | "invited";
    picture: {
      small: string;
      medium: string;
      large: string;
    };
    balance: {
      currency_code: string;
      amount: string;
    }[];
  };

  export type Debt = {
    from: number;
    to: number;
    amount: string;
    currency_code: string;
  };

  export type Group = {
    id: number;
    name: string;
    group_type: GroupType;
    updated_at: string;
    simplify_by_default: boolean;
    members: User[];
    original_debts: Debt[];
    simplified_debts: Debt[];
    avatar: {
      original: string;
      xxlarge: string;
      xlarge: string;
      large: string;
      medium: string;
      small: string;
    };
    custom_avatar: boolean;
    cover_photo: {
      xxlarge: string;
      xlarge: string;
    };
    invite_link: string;
  };

  // "never" "weekly" "fortnightly" "monthly" "yearly"
  export enum RepeatInterval {
    Never = "never",
    Weekly = "weekly",
    Fortnightly = "fortnightly",
    Monthly = "monthly",
    Yearly = "yearly",
  }

  type Repayment = {
    from: number;
    to: number;
    amount: string;
  };

  type CategorySlim = {
    id: number;
    name: string;
  };

  type CommentType = "System" | "User";

  type Comment = {
    id: number;
    content: string;
    comment_type: CommentType;
    relation_type: "ExpenseComment" | "GroupComment";
    relation_id: number;
    created_at: string;
    deleted_at: string;
    user: User | null;
  };

  export type Expense = {
    cost: string;
    description: string;
    details: string;
    date: string;
    repeat_interval: RepeatInterval;
    currency_code: string;
    category_id: number;
    id: number;
    group_id: number;
    friendship_id: number;
    expense_bundle_id: number;
    repeats: boolean;
    email_reminder: boolean;
    email_reminder_in_advance: unknown;
    next_repeat: string;
    comments_count: number;
    payment: boolean;
    transaction_confirmed: boolean;
    repayments: Repayment[];
    created_at: string;
    created_by: Omit<User, "balance">;
    updated_at: string;
    updated_by: Omit<User, "balance">;
    deleted_at: string;
    deleted_by: Omit<User, "balance">;
    category: CategorySlim;
    receipt: {
      large: string;
      original: string;
    };
    users: {
      user: Pick<User, "id" | "first_name" | "last_name" | "picture">;
      user_id: number;
      paid_share: string;
      owed_share: string;
      net_balance: string;
    }[];
    comments: Comment[];
  };

  type GetExpenseParam = {
    group_id: number;
    friendship_id: number;
    dated_after: string;
    dated_before: string;
    updated_after: string;
    updated_before: string;
    limit: number;
    offset: number;
  };

  type SplitwiseContructorOptions = {
    consumerKey: string;
    consumerSecret: string;
  };

  export type Category = {
    id: number;
    name: string;
    icon: string;
    icon_types: {
      slim: {
        small: string;
        large: string;
      };
      square: {
        large: string;
        xlarge: string;
      };
      transparent: {
        large: string;
        xlarge: string;
      };
    };
    subcategories: Category[];
  };

  type SplitwiseClient = {
    getCurrentUser(): Promise<unknown>;
    getGroups(): Promise<Group[]>;
    getExpenses(props?: Partial<GetExpenseParam>): Promise<Expense[]>;
    getGroup({ id: number }): Promise<Group>;
    getCategories(): Promise<Category[]>;
  };

  function Splitwise(options: SplitwiseContructorOptions): SplitwiseClient;
  export = Splitwise;
  export default Splitwise;
}
