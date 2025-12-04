import { jiraFetchObject, jiraUrl } from "./jira"
import { jiraImage } from "./image"
import { ResultItem, SearchCommand } from "./command"
import { Color, Icon, Image } from "@raycast/api"
import { ErrorText } from "./exception"

interface IssueType {
  id: string
  name: string
  iconUrl: string
}

interface IssueStatus {
  name: string
  statusCategory: {
    key: string
  }
}

interface Issue {
  id: string
  key: string
  fields: {
    summary: string
    issuetype: IssueType
    status: IssueStatus
  }
}

interface Issues {
  issues?: Issue[]
}

type IssueFilter = "allIssues" | "issuesInOpenSprints" | "myIssues" | "myIssuesInOpenSprints"

const fields = "summary,issuetype,status"

function statusIcon(status: IssueStatus): Image {
  const icon = (source: Image.Source, tintColor?: Color.ColorLike) => ({ source, tintColor })
  switch (status.statusCategory.key) {
    case "done":
      return icon(Icon.Checkmark, Color.Green)
    case "indeterminate":
      return icon(Icon.ArrowClockwise, Color.Blue)
    default:
      return icon(Icon.Circle)
  }
}

function isIssueKey(query: string): boolean {
  const issueKeyPattern = /^[a-z]+-[0-9]+$/i
  return query.match(issueKeyPattern) !== null
}

function buildJql(query: string): string {
  const spaceAndInvalidChars = /[ "]/
  const terms = query.split(spaceAndInvalidChars).filter((term) => term.length > 0)

  const collectPrefixed = (prefix: string, terms: string[]): string[] =>
    terms
      .filter((term) => term.startsWith(prefix) && term.length > prefix.length)
      .map((term) => term.substring(prefix.length))
  const projects = collectPrefixed("@", terms)
  const issueTypes = collectPrefixed("#", terms)
  const assignees = collectPrefixed("~", terms)
  const unwantedTextTermChars = /[-+!*&]/
  const textTerms = terms
    .filter((term) => !"@#~".includes(term[0]))
    .flatMap((term) => term.split(unwantedTextTermChars))
    .filter((term) => term.length > 0)

  const escapeStr = (str: string) => `"${str}"`
  const inClause = (entity: string, items: string[]) =>
    items.length > 0 ? `${entity} IN (${items.map(escapeStr)})` : undefined
  const jqlConditions = [
    inClause("project", projects),
    inClause("issueType", issueTypes),
    inClause("assignee", assignees),
    ...textTerms.map((term) => `text~"${term}*"`),
  ]

  const jql = jqlConditions.filter((condition) => condition !== undefined).join(" AND ")
  const nonEmptyJql = jql.length > 0 ? jql : "updated >= -180d"
  return nonEmptyJql + " order by lastViewed desc"
}

function jqlForFilter(filter?: IssueFilter) {
  switch (filter) {
    case "issuesInOpenSprints":
      return "sprint in openSprints()"
    case "myIssues":
      return "assignee=currentUser()"
    case "myIssuesInOpenSprints":
      return "assignee=currentUser() AND sprint in openSprints()"
    default:
      return undefined
  }
}

function jqlFor(query: string, filter?: IssueFilter): string {
  const filterJql = jqlForFilter(filter)
  const queryJql = isIssueKey(query) ? `key=${query}` : buildJql(query)
  return [filterJql, queryJql].filter(Boolean).join(" AND ")
}

async function searchIssues(query: string, filter?: IssueFilter): Promise<ResultItem[]> {
  const jql = jqlFor(query, filter)
  console.debug(jql)

  const result = await jiraFetchObject<Issues>(
    "/rest/api/3/search/jql",
    { jql, fields },
    { 400: ErrorText("Invalid Query", "Unknown project, issue type or assignee") },
  )
  const mapResult = async (issue: Issue): Promise<ResultItem> => ({
    id: issue.id,
    title: issue.fields.summary,
    subtitle: `${issue.key} · ${issue.fields.issuetype.name}`,
    icon: await jiraImage(issue.fields.issuetype.iconUrl),
    accessories: [
      {
        tag: issue.fields.status.name,
        icon: statusIcon(issue.fields.status),
      },
    ],
    url: `${jiraUrl}/browse/${issue.key}`,
    linkText: `${issue.key}: ${issue.fields.summary}`,
  })
  return result.issues && result.issues.length > 0 ? Promise.all(result.issues.map(mapResult)) : []
}

function openIssueKey(query: string): ResultItem | undefined {
  if (isIssueKey(query)) {
    return {
      id: query,
      url: `${jiraUrl}/browse/${query}`,
      title: `Open issue ${query}`,
    }
  }
}

export default function SearchIssueCommand() {
  return SearchCommand(
    searchIssues,
    "Search issues by text, @project, #type, ~assignee",
    {
      tooltip: "Filters",
      values: [
        { name: "All Issues", value: "allIssues" },
        { name: "Issues in Open sprints", value: "issuesInOpenSprints" },
        { name: "Assigned to Me", value: "myIssues" },
        { name: "My Issues in Open sprints", value: "myIssuesInOpenSprints" },
      ],
    },
    openIssueKey,
  )
}
