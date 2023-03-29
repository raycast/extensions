export type Response<T> = {
  success: boolean;
  message: string;
  result?: T;
};
export interface Topic {
  id: number;
  title: string;
  content: string;
  content_rendered: string;
  syntax: number;
  url: string;
  replies: number;
  last_reply_by: string;
  created: number;
  last_modified: number;
  last_touched: number;
  member?: Member;
  node?: Node;
}
export interface Node {
  id: number;
  url: string;
  name: string;
  title: string;
  header: string;
  footer: string;
  avatar: string;
  topics: number;
  created: number;
  last_modified: number;
  // V1
  avatar_mini: string;
}
export interface Member {
  id: number;
  username: string;
  bio: string;
  website: string;
  github: string;
  url: string;
  avatar: string;
  created: number;
  // V1
  avatar_mini: string;
  avatar_normal: string;
  avatar_large: string;
}
export interface Reply {
  id: number;
  content: string;
  content_rendered: string;
  created: number;
  member: Member;
}
export interface Token {
  token: string;
  scope: Scope;
  expiration: number;
  good_for_days: number;
  total_used: number;
  last_used: number;
  created: number;
}
export interface Notification {
  id: number;
  member_id: number;
  for_member_id: number;
  text: string;
  payload: string;
  payload_rendered: string;
  created: number;
  member: Pick<Member, "username">;
}
export enum Scope {
  everything,
  regular,
}

export type CachedResponse<T> = {
  expiration: number;
  data: Response<T>;
};
