import { jiraFetchObject, jiraUrl } from "./jira";
import { jiraImage } from "./image";
import { ResultItem, SearchCommand } from "./command";
import { Color, Icon, Image } from "@raycast/api";
import { ErrorText } from "./exception";
import { buildIssueSearchJql } from "./issue-search";

interface IssueType {
  id: string;
  name: string;
  iconUrl: string;
}

interface IssueStatus {
  name: string;
  statusCategory: {
    key: string;
  };
}

interface Issue {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: IssueType;
    status: IssueStatus;
  };
}

interface Issues {
  issues?: Issue[];
}

const fields = "summary,issuetype,status";
const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/i;

function statusIcon(status: IssueStatus): Image {
  const icon = (source: Image.Source, tintColor?: Color.ColorLike) => ({
    source,
    tintColor,
  });
  switch (status.statusCategory.key) {
    case "done":
      return icon(Icon.Checkmark, Color.Green);
    case "indeterminate":
      return icon(Icon.ArrowClockwise, Color.Blue);
    default:
      return icon(Icon.Circle);
  }
}

/**
 * Validates whether a string is a properly formatted issue key.
 *
 * A valid issue key must:
 *  - Start with a letter (A–Z)
 *  - Contain at least two characters before the dash (letters or digits)
 *  - Have a dash (-) followed by one or more digits
 *  - Be case-insensitive (e.g., "ac-23" is valid)
 *
 * You can test this pattern here: https://regex101.com/r/dHHMLe/1
 *
 * ✅ Valid examples:
 *  - "AC-23"
 *  - "AC2-23"
 *  - "A2C-23"
 *  - "ABC-123"
 *
 * ❌ Invalid examples:
 *  - "A-23"   → Only one character before dash
 *  - "2A-23"  → Does not start with a letter
 *  - "123-23" → No letters before dash
 *  - "-23"    → Missing prefix
 *  - "A_C-23" → Underscore not allowed
 *  - "A-23B"  → Suffix must be numeric
 *
 * @param query - The string to check.
 * @returns True if the string matches the issue key pattern, otherwise false.
 */
function isIssueKey(query: string): boolean {
  return ISSUE_KEY_PATTERN.test(query.trim());
}

function buildJql(query: string): string {
  return buildIssueSearchJql(query);
}

function jqlFor(query: string): string {
  const trimmedQuery = query.trim();
  return isIssueKey(trimmedQuery) ? `key=${trimmedQuery}` : buildJql(query);
}

export async function searchIssues(query: string): Promise<ResultItem[]> {
  const jql = jqlFor(query);
  console.debug(jql);
  const result = await jiraFetchObject<Issues>(
    "/rest/api/2/search",
    { jql, fields },
    { 400: ErrorText("Invalid Query", "Unknown project, issue type, status, or assignee") },
  );
  const mapResult = async (issue: Issue): Promise<ResultItem> => ({
    id: issue.id,
    title: issue.fields.summary,
    subtitle: `${issue.key} · ${issue.fields.issuetype.name}`,
    icon: await jiraImage(issue.fields.issuetype.iconUrl),
    accessoryIcon: statusIcon(issue.fields.status),
    accessoryTitle: issue.fields.status.name,
    url: `${jiraUrl}/browse/${issue.key}`,
    linkText: `${issue.key}: ${issue.fields.summary}`,
  });
  return result.issues && result.issues.length > 0 ? Promise.all(result.issues.map(mapResult)) : [];
}

export default function SearchIssueCommand() {
  return SearchCommand(searchIssues, "Search issues by text, @project, #issueType, !status and %assignee");
}
