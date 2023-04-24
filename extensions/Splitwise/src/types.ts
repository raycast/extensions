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

export type Balance = {
  currency_code: string;
  amount: string;
};

export type Group = {
  group_id: number;
  balance: Balance[];
};

export type Picture = {
  small: string;
  medium: string;
  large: string;
};
