export type Entity = Friend | Group;

export type FriendOrGroupProps =
  | {
      friend: Friend;
      group?: never;
      revalidateFriends: () => void;
    }
  | {
      friend?: never;
      group: Group;
      revalidateGroups: () => void;
    };

export type GetFriends = {
  friends: Friend[];
};

export type Friend = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  registration_status: string;
  picture: Picture;
  groups: Group[];
  balance: Balance[];
  updated_at: Date;
};

export type GetGroups = {
  groups: Group[];
};

export type Balance = {
  currency_code: string;
  amount: string;
};

export type Group = {
  id: number;
  name: string;
  avatar: Picture;
  updated_at: Date;
};

export type Picture = {
  small: string;
  medium: string;
  large: string;
};

export type ExpenseParams = {
  description: string;
  date: Date | null;
  cost: string;
  currency_code: string;
  group_id?: number;
  split_equally?: boolean;
  users__0__user_id?: number;
  users__0__paid_share?: string;
  users__0__owed_share?: string;
  users__1__user_id?: number;
  users__1__owed_share?: string;
};

export type Expense = {
  description: string;
  cost: number;
  currency_code: string;
  errors?: { [key: string]: string };
};

export type Body = {
  valid: boolean;
  expense: Expense;
};
