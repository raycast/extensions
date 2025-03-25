import { jiraFetchObject, jiraUrl } from "./jira";
import { jiraImage } from "./image";
import { ResultItem, SearchCommand } from "./command";
import { Color, Icon, Image } from "@raycast/api";
import { ErrorText } from "./exception";

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

interface User {
  accountId: string;
  accountType: string;
  active: boolean;
  avatarUrls: {
    "48x48": string;
    "24x24": string;
    "16x16": string;
    "32x32": string;
  };
  displayName: string;
  emailAddress: string;
  key: string;
  name: string;
  self: string;
  timeZone: string;
}

const fields = "summary,issuetype,status";

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

function isIssueKey(query: string): boolean {
  const issueKeyPattern = /^[a-z]+-[0-9]+$/i;
  return query.match(issueKeyPattern) !== null;
}

function buildJql(query: string, assignee: string): string {
  const spaceAndInvalidChars = /[ "]/;

  const statusRegex = /!([a-z0-9_-]+|"[a-z0-9_ -]+")/gi;
  const statusMatchingGroup = Array.from(query.matchAll(statusRegex));
  const statuus = statusMatchingGroup.map((item) => item[1].replace(/^"|"$/g, ""));

  console.log("Status: ", statuus);
  query = query.replace(statusRegex, "");

  const terms = query.split(spaceAndInvalidChars).filter((term) => term.length > 0);

  const collectPrefixed = (prefix: string, terms: string[]): string[] =>
    terms
      .filter((term) => term.startsWith(prefix) && term.length > prefix.length)
      .map((term) => term.substring(prefix.length));
  const projects = collectPrefixed("@", terms);
  const issueTypes = collectPrefixed("#", terms);

  const unwantedTextTermChars = /[-+!*&]/;
  const textTerms = terms
    .filter((term) => !"@#!%".includes(term[0]))
    .flatMap((term) => term.split(unwantedTextTermChars))
    .filter((term) => term.length > 0);

  const escapeStr = (str: string) => `"${str}"`;
  const inClause = (entity: string, items: string[]) =>
    items.length > 0 ? `${entity} IN (${items.map(escapeStr)})` : undefined;
  const jqlConditions = [
    inClause("project", projects),
    inClause("issueType", issueTypes),
    inClause("status", statuus),
    inClause("assignee", [assignee]),
    "statusCategory != Done",
    ...textTerms.map((term) => `text~"${term}*"`),
  ];

  const jql = jqlConditions.filter((condition) => condition !== undefined).join(" AND ");
  return jql + " order by lastViewed desc";
}

function jqlFor(query: string, assignee: string): string {
  return isIssueKey(query) ? `key=${query}` : buildJql(query, assignee);
}

export async function searchIssues(query: string): Promise<ResultItem[]> {
  const myselfResult = await jiraFetchObject<User>("/rest/api/2/myself");
  const jql = jqlFor(query, myselfResult.emailAddress);
  console.debug(jql);
  const result = await jiraFetchObject<Issues>(
    "/rest/api/2/search",
    { jql, fields },
    { 400: ErrorText("Invalid Query", "Unknown project or issue type") },
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

export default function SearchMyIssueCommand() {
  return SearchCommand(searchIssues, "Search issues by text, @project, #issueType and !status");
}
