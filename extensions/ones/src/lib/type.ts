import { ManhourType } from "./api";

export interface GraphqlData {
  query: string;
  variables?: { [key: string]: any };
}

export interface Task {
  uuid: string;
  name?: string;
  number?: number;
  priority?: Option;
  url?: string;
  project?: Project;
}

export interface Sprint {
  uuid: string;
  number: number;
  name: string;
  description: string;
  assign: User;
  project: Project;
  url?: string;
  planStartTime: number;
  planEndTime: number;
}

export interface User {
  uuid: string;
  name?: string;
  avatar?: string;
}

export interface Project {
  uuid: string;
  name: string;
}

export interface SearchItem {
  fields: { [key: string]: any };
  highlight_fields: { [key: string]: any };
  url?: string;
}

export interface SearchResult {
  datas: {
    task?: SearchItem[];
    project?: SearchItem[];
    resource?: SearchItem[];
    page?: SearchItem[];
    space?: SearchItem[];
  };
  has_next: boolean;
  next_cursor: number;
  took_time: number;
  total: number;
}

export interface Option {
  value: string;
  uuid: string;
}

export interface Space {
  uuid: string;
  name: string;
}

export interface Project {
  uuid: string;
  name: string;
}

export interface Manhour {
  uuid?: string;
  hours: number;
  startTime: number; // seconds
  owner: User;
  task: Task;
  description: string;
  type: ManhourType;
}

export interface LoginUser {
  uuid: string;
  email: string;
  name: string;
  avatar: string;
  token: string;
}

export interface LoginTeam {
  uuid: string;
  name: string;
  owner: string;
  logo: string;
}

export interface LoginOrg {
  uuid: string;
  name: string;
}

export interface LoginResult {
  user: LoginUser;
  teams: LoginTeam[];
  org: LoginOrg;
}
