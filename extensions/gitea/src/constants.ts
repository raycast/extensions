export const DEFAULT_PAGE_SIZE = 30 as const;
export const API_BASE = "/api/v1" as const;

export const CacheKey = {
  CurrentUser: "current-user",
  Notifications: "notifications",
  NotificationsMenuBar: "notifications-menu-bar",
  Repositories: "repositories",
  UserRepositories: "user-repositories",
  Issues: "issues",
  PullRequests: "pull-requests",
  IssueSearch: "issues-search",
  IssueCategoryFilter: "issues-category-filter",
  PullRequestCategoryFilter: "pull-requests-category-filter",
} as const;
