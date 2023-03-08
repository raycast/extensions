export type BoardsResponse = {
  me: Me;
  boards: Board[];
};

export type Me = {
  id: number;
  name: string;
  account: Account;
};

export type Account = {
  id: number;
  slug: string;
};

export type Board = {
  id: number;
  name: string;
  updated_at: string;
  description: string;
  owner: User;
  workspace?: Workspace;
};

export type User = {
  id: number;
  name: string;
  title: string;
  url: string;
  birthday: string;
  email: string;
  created_at: string;
  photo_thumb: string;
  phone: string;
  mobile_phone: string;
  location: string;
};

export type Workspace = {
  id: number;
  name: string;
};

export type Group = {
  id: string;
  title: string;
  color: string;
  position: string;
};
