export interface GetExpenses {
  expenses: Expense[];
}

export interface Expense {
  cost: string;
  description: string;
  details: string;
  date: Date;
  repeat_interval: string;
  currency_code: string;
  category_id: number;
  id: number;
  group_id: number;
  friendship_id: number;
  expense_bundle_id: number;
  repeats: boolean;
  email_reminder: boolean;
  email_reminder_in_advance: null;
  next_repeat: string;
  comments_count: number;
  payment: boolean;
  transaction_confirmed: boolean;
  repayments: Repayment[];
  created_at: Date;
  created_by: TedBy;
  updated_at: Date;
  updated_by: TedBy;
  deleted_at: Date;
  deleted_by: TedBy;
  category: Category;
  receipt: Receipt;
  users: UserElement[];
  comments: Comment[];
}

export interface Category {
  id: number;
  name: string;
}

export interface Comment {
  id: number;
  content: string;
  comment_type: string;
  relation_type: string;
  relation_id: number;
  created_at: Date;
  deleted_at: Date;
  user: CommentUser;
}

export interface CommentUser {
  id: number;
  first_name: string;
  last_name: string;
  picture: UserPicture;
}

export interface UserPicture {
  medium: string;
}

export interface TedBy {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  registration_status: string;
  picture: CreatedByPicture;
}

export interface CreatedByPicture {
  small: string;
  medium: string;
  large: string;
}

export interface Receipt {
  large: string;
  original: string;
}

export interface Repayment {
  from: number;
  to: number;
  amount: string;
}

export interface UserElement {
  user: CommentUser;
  user_id: number;
  paid_share: string;
  owed_share: string;
  net_balance: string;
}
