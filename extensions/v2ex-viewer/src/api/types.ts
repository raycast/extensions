export interface Topic {
  id: number;
  title: string;
  content: string;
  content_rendered: string;
  url: string;
  replies: number;
  last_reply_by: string;
  created: number;
  last_modified: number;
  last_touched: number;
  member: Member;
  node: Node;
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
  // API V1
  stars: number;
  avatar_mini: string;
  avatar_normal: string;
  avatar_large: string;
  root: boolean;
  parent_node_name: string;
}
export interface Member {
  id: number;
  username: string;
  url: string;
  avatar: string;
  created: number;
  // API V1
  avatar_mini: string;
  avatar_normal: string;
  avatar_large: string;
}
export interface Reply {
  id: number;
  content: string;
  content_rendered: string;
  created: number;
  member: Pick<Member, "id" | "username" | "url">;
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
export enum TopicSource {
  "Hot" = "hot",
  "Latest" = "latest",
}
