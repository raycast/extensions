import { getPreferenceValues } from "@raycast/api";
import { Octokit } from "octokit";

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
  state: string;
  // labels[]
}

export interface PullRequest {
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
  state: string;
  state_reason: string | null | undefined;
  merged_at?: string | null | undefined;
  // labels[]
}

export interface Project {
  id: number;
  name: string;
  full_name: string;
  owner_avatar_url?: string;
  stargazers_count: number;
}

let octokitInstance: Octokit | undefined;

export function getGitHubAPI(): Octokit {
  if (!octokitInstance) {
    const prefs = getPreferenceValues();
    const pat = (prefs.pat as string) || undefined;

    octokitInstance = new Octokit({ auth: pat });
  }
  return octokitInstance;
}
