export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  updated_at: string;
  is_fork: boolean;
  parent_full_name?: string;
  is_private: boolean;
  is_archived: boolean;
  is_own_repo: boolean;
  stargazers_count: number;
  open_issues_count: number;
  open_prs_count: number;
}
