// No default project IDs - user must configure them in preferences

export const GITLAB_API_ENDPOINTS = {
  PROJECTS: "/api/v4/projects",
  MERGE_REQUESTS: (projectId: number) => `/api/v4/projects/${projectId}/merge_requests`,
} as const;

export const SEARCH_PLACEHOLDERS = {
  PROJECTS: "Search projects...",
  MERGE_REQUESTS: "Search merge requests...",
} as const;

export const NAVIGATION_TITLES = {
  PROJECTS: "GitLab Projects",
  MERGE_REQUESTS: (projectName: string) => `Merge Requests - ${projectName}`,
} as const;

export const EMPTY_VIEW_MESSAGES = {
  NO_PROJECTS: {
    title: "No projects found",
    description: "Make sure your GitLab token has access to your projects.",
  },
  NO_MERGE_REQUESTS: {
    title: "No merge requests found",
    description: "This project has no open merge requests matching your search.",
  },
  NO_PROJECT_IDS_CONFIGURED: {
    title: "No Project IDs Configured",
    description: "Please configure project IDs in extension preferences to view projects.",
  },
} as const;
