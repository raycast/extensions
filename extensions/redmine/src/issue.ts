import { Color, Icon } from "@raycast/api";
import { ResultItem, SearchCommand } from "./command";
import { ErrorText } from "./exception";
import { priorityColor, redmineFetchObject, redmineUrl } from "./redmine";

interface IssueProject {
  id: number;
  name: string;
}
interface IssuePriority {
  id: number;
  name: string;
}
interface IssueTracker {
  id: number;
  name: string;
}
interface IssueStatus {
  id: number;
  name: string;
}
interface IssuePerson {
  id: number;
  name: string;
}

interface Issue {
  id: number;
  project: IssueProject;
  priority: IssuePriority;
  tracker: IssueTracker;
  status: IssueStatus;
  assigned_to: IssuePerson;
  author: IssuePerson;
  subject: string;
  description: string;
  start_date: string;
  due_date: string;
}

interface Issues {
  issues?: Issue[];
}

function issueColor(issue: Issue): Color {
  return priorityColor(issue.priority.name);
}

export async function searchMyIssues(): Promise<ResultItem[]> {
  const result = await redmineFetchObject<Issues>(
    "/issues.json?assigned_to_id=me",
    {},
    { 400: ErrorText("Invalid Query", "Unknown project or issue type") }
  );
  console.log(result);
  const mapResult = async (issue: Issue): Promise<ResultItem> => ({
    id: String(issue.id),
    title: `#${issue.id} · ${issue.subject}`,
    subtitle: `${issue.project.name} · ${issue.status.name}`,
    accessoryTitle: issue.priority.name,
    url: `${redmineUrl}/issues/${issue.id}`,
    linkText: `${issue.id}: ${issue.subject}`,
    icon: {
      source: Icon.Circle,
      tintColor: issueColor(issue),
    },
  });
  return result.issues && result.issues.length > 0 ? Promise.all(result.issues.map(mapResult)) : [];
}

export default function SearchIssueCommand() {
  return SearchCommand(searchMyIssues, "Search issues by text");
}
