export const issueFilters = <const>["allIssues", "myIssues"]
export type IssueFilter = (typeof issueFilters)[number]
