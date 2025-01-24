// src/types/index.ts

export interface Preferences {
  githubToken: string;
}

export interface ValidatorFunction {
  name: string;
  description: string;
  signature: string;
  path: string;
  category: string;
  examples?: string;
  notes?: string;
}

export interface ValidatorFunctionWithImpl extends ValidatorFunction {
  fullImplementation: string;
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content?: string;
  encoding?: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content: string;
  encoding: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface CachedContent {
  content: string;
  timestamp: number;
}

export type Cache = Record<string, CachedContent | null>;

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

export interface GitHubResponse<T = unknown> {
  data: T;
  rateLimit: RateLimit;
}

export interface FetchOptions {
  headers: Record<string, string>;
  method?: string;
  body?: string;
}
