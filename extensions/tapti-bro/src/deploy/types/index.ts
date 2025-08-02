export interface Preferences {
  userName: string;
  githubToken: string;
  githubWorkflowDispatchUrl: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
  event: string;
  workflow_id: number;
  head_branch: string;
  head_sha: string;
}

export interface DeployableService {
  value: string;
  title: string;
  subtitle: string;
  hasParams: boolean;
  icon: string;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
}
