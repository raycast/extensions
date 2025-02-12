import { Namespace, Repository, User } from "./repository";

export interface NotificationResponse {
  total_count: number;
  list: Notification[];
}

export interface Notification {
  id: number;
  content: string;
  type: string;
  unread: boolean;
  mute: boolean;
  updated_at: string;
  url: string;
  html_url: string;
  actor: User;
  repository: Repository;
  subject: Subject;
  namespaces: Namespace[];
}

export interface Subject {
  title: string;
  url: string;
  latest_comment_url: null;
  type: string;
}
