import { getIssuesForAI } from "../api/issues";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

type Input = {
  /**
   * A JQL (Jira Query Language) string used to filter and search for issues in Jira.
   *
   * JQL allows users to query Jira issues based on their attributes. It supports filtering, searching, sorting, and combining conditions to retrieve specific issues. This documentation provides a complete reference for JQL syntax, supported fields, operators, functions, and examples.
   *
   * JQL Syntax:
   * A JQL query is composed of three main components:
   * 1. Field: The attribute of an issue to filter by (e.g., project, status, assignee, priority).
   * 2. Operator: Defines the relationship between the field and its value (e.g., =, !=, IN, ~).
   * 3. Value: The specific value or pattern being searched for (e.g., "MYPROJECT", "High", "BUG-123").
   *
   * Basic Structure:
   * field operator value
   * Example: project = "MYPROJECT"
   * This query retrieves all issues in the "MYPROJECT" project.
   *
   * Supported Fields:
   * - project: The project the issue belongs to.
   * - issuekey: The unique identifier for an issue (e.g., PROJECT-123).
   * - summary: The issue's title or summary.
   * - description: The detailed description of the issue.
   * - status: The workflow status of the issue (e.g., "To Do", "In Progress", "Done").
   * - priority: The priority level of the issue (e.g., "Highest", "High", "Medium", "Low").
   * - assignee: The user assigned to the issue.
   * - reporter: The user who created the issue.
   * - labels: Labels associated with the issue.
   * - created: The date the issue was created.
   * - updated: The date the issue was last updated.
   * - resolution: The resolution status of the issue (e.g., "Unresolved", "Fixed").
   * - duedate: The due date of the issue.
   * - components: The components associated with the issue.
   * - fixVersion: The version in which the issue is fixed.
   * - affectedVersion: The version(s) affected by the issue.
   * - type: The type of the issue (e.g., "Bug", "Task", "Story").
   *
   * Supported Operators:
   * Operators define how the field relates to the value. Jira supports the following operators:
   * General Operators:
   * - =: Equals the specified value.
   * - !=: Does not equal the specified value.
   * - IN: Matches any value in a list of values.
   * - NOT IN: Does not match any value in a list of values.
   * - IS: Used with EMPTY or NOT EMPTY to check for null/empty values.
   * - ~: Contains the specified text (case-insensitive).
   * - !~: Does not contain the specified text.
   * Numeric and Date Operators:
   * - <: Less than the specified value.
   * - <=: Less than or equal to the specified value.
   * - >: Greater than the specified value.
   * - >=: Greater than or equal to the specified value.
   * Logical Operators:
   * - AND: Combines multiple conditions, all of which must be true.
   * - OR: Combines multiple conditions, at least one of which must be true.
   * - NOT: Negates a condition.
   *
   * Functions in JQL:
   * JQL supports several built-in functions to create dynamic and flexible queries:
   * - currentUser(): Filters issues assigned to the currently logged-in user.
   * - membersOf(group): Filters issues assigned to members of a specific group.
   * - startOfDay(), endOfDay(): Filters issues based on the current day.
   * - startOfWeek(), endOfWeek(): Filters issues based on the current week.
   * - startOfMonth(), endOfMonth(): Filters issues based on the current month.
   * - now(): Filters issues based on the current time.
   *
   * Example:
   * assignee = currentUser() AND created >= startOfWeek()
   * Retrieves all issues assigned to the current user that were created since the start of the current week.
   *
   * Combining Conditions:
   * You can combine multiple conditions using logical operators:
   * AND: All conditions must be true.
   * Example:
   * project = "MYPROJECT" AND status = "In Progress"
   * OR: At least one condition must be true.
   * Example:
   * status = "To Do" OR priority = "High"
   * NOT: Negates a condition.
   * Example:
   * NOT status = "Done"
   * Parentheses can be used to group conditions:
   * Example:
   * (status = "To Do" OR status = "In Progress") AND priority = "High"
   *
   * Sorting Results:
   * Use the ORDER BY clause to sort the results. You can sort by one or more fields in ascending or descending order:
   * Sort by creation date (newest first):
   * ORDER BY created DESC
   * Sort by priority (ascending) and then by updated date (descending):
   * ORDER BY priority ASC, updated DESC
   *
   * Examples of JQL Queries:
   * 1. Retrieve all issues in a project:
   * project = "MYPROJECT"
   * 2. Retrieve a specific issue by its key:
   * issuekey = "MYPROJECT-123"
   * 3. Search for issues containing specific text:
   * text ~ "urgent bug"
   * 4. Retrieve unresolved issues:
   * resolution IS EMPTY
   * 5. Retrieve issues assigned to the current user:
   * assignee = currentUser()
   * 6. Retrieve issues created in the last 7 days:
   * created >= -7d
   * 7. Combine multiple conditions:
   * project = "MYPROJECT" AND (status = "To Do" OR status = "In Progress") AND priority = "High"
   * 8. Retrieve issues with specific labels:
   * labels = "Bug"
   * 9. Retrieve issues updated in the last 24 hours:
   * updated >= -1d
   * 10. Retrieve issues with a specific component:
   * component = "Backend"
   *
   * Advanced Use Cases:
   * 1. Retrieve issues linked to a specific issue:
   * issueLinkType = "blocks" AND linkedIssue = "MYPROJECT-123"
   * 2. Retrieve issues with a specific fix version:
   * fixVersion = "1.0.0"
   * 3. Retrieve issues assigned to a group of users:
   * assignee IN membersOf("developers")
   *
   * Special Considerations:
   * Escaping Special Characters: Special characters in text searches (e.g., ", \) must be escaped.
   * Example:
   * text ~ "urgent \"bug\""
   * Performance: Complex queries or large datasets may take longer to execute.
   * Unsupported Fields: Do not attempt to filter by fields that are not indexed or supported by Jira.
   *
   * Limitations:
   * JQL does not support calculations or aggregations.
   * Queries must adhere to Jira's supported fields and syntax.
   *
   * Examples:
   * "project = 'MYPROJECT' ORDER BY created DESC"
   * "assignee = currentUser() AND resolution IS EMPTY"
   * "labels = 'Bug'"
   * "project = 'MYPROJECT' AND text ~ 'critical bug' ORDER BY updated DESC"
   *
   * IMPORTANT: Most of the time, you'll want to prioritize a text or description search.
   */
  jql: string;
};

export default withJiraCredentials(async function (input: Input) {
  const issues = await getIssuesForAI({ jql: input.jql });
  return issues;
});
