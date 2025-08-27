/**
 * Common fields shared between different GitHub API responses
 */
type GitHubEntity = {
  id: number;
  url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
};

/**
 * GitHub user/owner information
 */
type GitHubUser = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
};

/**
 * GitHub repository information
 */
type GitHubRepository = {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUser;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  forks_url: string;
  keys_url: string;
  collaborators_url: string;
  teams_url: string;
  hooks_url: string;
  issue_events_url: string;
  events_url: string;
  assignees_url: string;
  branches_url: string;
  tags_url: string;
  blobs_url: string;
  git_tags_url: string;
  git_refs_url: string;
  trees_url: string;
  statuses_url: string;
  languages_url: string;
  stargazers_url: string;
  contributors_url: string;
  subscribers_url: string;
  subscription_url: string;
  commits_url: string;
  git_commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  contents_url: string;
  compare_url: string;
  merges_url: string;
  archive_url: string;
  downloads_url: string;
  issues_url: string;
  pulls_url: string;
  milestones_url: string;
  notifications_url: string;
  labels_url: string;
  releases_url: string;
  deployments_url: string;
};

/**
 * GitHub package version response
 */
export type VersionResponse = GitHubEntity & {
  name: string;
  package_html_url: string;
  metadata: {
    package_type: string;
    container: {
      tags: string[];
    };
  };
};

/**
 * GitHub package response
 */
export type PackageResponse = GitHubEntity & {
  name: string;
  package_type: string;
  owner: GitHubUser;
  version_count: number;
  visibility: string;
  repository: GitHubRepository;
};

/**
 * Filter type for package types
 */
export type FilterType = "npm" | "maven" | "rubygems" | "docker" | "nuget" | "container";
