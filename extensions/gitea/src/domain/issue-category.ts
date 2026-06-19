import type { Option } from "./options";

export const IssueCategory = {
  All: "all",
  Created: "created",
  Assigned: "assigned",
  Mentioned: "mentioned",
} as const;
export type IssueCategory = (typeof IssueCategory)[keyof typeof IssueCategory];

export const IssueCategoryOptions = [
  { id: "all", name: "All", value: IssueCategory.All },
  { id: "created", name: "Created", value: IssueCategory.Created },
  { id: "assigned", name: "Assigned", value: IssueCategory.Assigned },
  { id: "mentioned", name: "Mentioned", value: IssueCategory.Mentioned },
] as const satisfies readonly Option<IssueCategory>[];

export const PullRequestCategory = {
  All: "all",
  Created: "created",
  Assigned: "assigned",
  Mentioned: "mentioned",
  ReviewRequested: "review_requested",
  Reviewed: "reviewed",
  OwnedRepositories: "owned_repositories",
} as const;
export type PullRequestCategory = (typeof PullRequestCategory)[keyof typeof PullRequestCategory];

export const PullRequestCategoryOptions = [
  { id: "all", name: "All", value: PullRequestCategory.All },
  { id: "created", name: "Created by you", value: PullRequestCategory.Created },
  { id: "assigned", name: "Assigned to you", value: PullRequestCategory.Assigned },
  { id: "mentioned", name: "Mentioning you", value: PullRequestCategory.Mentioned },
  { id: "review-requested", name: "Review requested", value: PullRequestCategory.ReviewRequested },
  { id: "reviewed", name: "Reviewed by you", value: PullRequestCategory.Reviewed },
  { id: "owned-repositories", name: "Repositories you own", value: PullRequestCategory.OwnedRepositories },
] as const satisfies readonly Option<PullRequestCategory>[];
