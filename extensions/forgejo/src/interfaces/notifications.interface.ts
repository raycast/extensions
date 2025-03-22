import { Repo } from "./repo.search.interface";

export interface Notification {
  id: string;
  repository: Repo;
  subject: Subject;
  url: string;
}

export interface Subject {
  title: string;
  html_url: string;
  type: string;
  state: string;
  tabNum: string;
}
