export const issueFilters = <const>["allIssues", "issuesInOpenSprints", "myIssues", "myIssuesInOpenSprints"]
export type IssueFilter = (typeof issueFilters)[number]
