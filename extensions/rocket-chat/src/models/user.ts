export type DirectMessage = {
  _id: string;
  usernames: string[];
  usersCount: number;
  uids: string[];
  lm: string;
  isGroupChat: boolean;
  involvedUsers: User[];
};

export type UserStatus = "online" | "offline" | "busy" | "away";

export interface User {
  _id: string;
  type: "user" | "bot";
  status: UserStatus;
  name: string;
  username: string;
  active: boolean;
  nameInsensitive: string;
}

export interface Team {
  _id: string;
  name: string;
  usersCount: number;
}

export interface Channel {
  _id: string;
  name: string;
  usersCount: number;
  belongsTo: string;
}
