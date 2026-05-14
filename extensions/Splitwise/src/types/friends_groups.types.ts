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

export type Body = {
  valid: boolean;
  expense: import("./get_expenses.types").Expense;
};
