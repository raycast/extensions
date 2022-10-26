export interface Repo {
  id: number;
  name: string;
  full_name: string;
}

export interface User {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  html_url: string;
  type: string;
}

export interface Issue {
  id: number;
  number: number;
  url: string;
  title: string;
  html_url: string;
  body_text: string;
  repository?: Repo;
  //milestone
  user: User;
  updated_at: string;
  created_at: string;
  // labels[]
}

export interface Project {
  id: number;
  name: string;
  full_name: string;
  owner_avatar_url?: string;
  stargazers_count: number;
}
