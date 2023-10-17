export type Entity = Friend | Group;

export type FriendOrGroupProps = { friend: Friend; group?: never } | { friend?: never; group: Group };

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
  input: string;
  friend_id?: number;
  group_id?: number;
  autosave: boolean;
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
