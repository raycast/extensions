import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorText } from "./exception";
import { IssueDetailView } from "./issue-detail";
import { getProjects, Issue, priorityColor, redmineUrl } from "./redmine";

export type ResultItem = List.Item.Props & {
  url: string;
  linkText?: string;
};
/** Loads the items for the given text query and selected project (empty string = all projects). */
type SearchFunction = (query: string, projectId: string) => Promise<ResultItem[]>;

const markdownLink = (item: ResultItem) => `[${item.linkText ?? item.title}](${item.url})`;
const htmlLink = (item: ResultItem) => `<a href="${item.url}">${item.linkText ?? item.title}</a>`;

export function SearchCommand(search: SearchFunction, searchBarPlaceholder?: string) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<Issue["project"][]>([]);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorText>();

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((e) => console.warn("Could not load projects", e));
  }, []);

  useEffect(() => {
    // Requests can overlap while typing, so ignore any response that is no longer
    // the one for the current query/project, otherwise a slow earlier request wins.
    let outdated = false;
    setError(undefined);
    setIsLoading(true);
    search(query, projectId)
      .then((resultItems) => {
        if (outdated) return;
        setItems(resultItems);
      })
      .catch((e) => {
        if (outdated) return;
        setItems([]);
        console.warn(e);
        if (e instanceof Error) {
          setError(ErrorText(e.name, e.message));
        }
      })
      .finally(() => {
        if (!outdated) setIsLoading(false);
      });
    return () => {
      outdated = true;
    };
  }, [query, projectId]);

  useEffect(() => {
    if (error) {
      showToast(Toast.Style.Failure, error.name, error.message);
    }
  }, [error]);

  const buildItem = (item: ResultItem) => (
    <List.Item
      key={item.id}
      {...item}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Issue">
            {item.id ? (
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<IssueDetailView issueId={Number(item.id)} />}
              />
            ) : null}
            <Action.OpenInBrowser url={item.url} />
            <Action.CopyToClipboard content={item.url} title="Copy URL" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Filter">
            <ActionPanel.Submenu
              title="Filter by Project"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            >
              <Action title="All Projects" autoFocus={projectId === ""} onAction={() => setProjectId("")} />
              {projects.map((p) => (
                <Action
                  key={p.id}
                  title={p.name}
                  autoFocus={projectId === String(p.id)}
                  onAction={() => setProjectId(String(p.id))}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          <ActionPanel.Section title="Link">
            <Action.CopyToClipboard content={markdownLink(item)} title="Copy Markdown Link" />
            <Action.CopyToClipboard content={htmlLink(item)} title="Copy HTML Link" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by project" value={projectId} onChange={setProjectId} storeValue>
          <List.Dropdown.Item title="All projects" value="" />
          {projects.map((p) => (
            <List.Dropdown.Item key={p.id} title={p.name} value={String(p.id)} />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      {items.map(buildItem)}
    </List>
  );
}

const MAX_PROJECT_LABEL_LENGTH = 10;

/** Shortens a project name for the list subtitle: keeps the first segment before " - ", capped in length. */
function shortProjectName(name: string): string {
  const firstSegment = name.split(" - ")[0].trim();
  return firstSegment.length > MAX_PROJECT_LABEL_LENGTH
    ? `${firstSegment.slice(0, MAX_PROJECT_LABEL_LENGTH)}…`
    : firstSegment;
}

/** Abbreviates a person's first name to its initial: "John Doe" -> "J. Doe". */
function shortPersonName(name: string): string {
  const spaceIndex = name.indexOf(" ");
  if (spaceIndex <= 0) return name;
  return `${name[0]}.${name.slice(spaceIndex)}`;
}

/** Maps a Redmine issue into a `ResultItem` for the list UI. */
export function issueToItem(issue: Issue): ResultItem {
  return {
    id: String(issue.id),
    title: `#${issue.id} · ${issue.subject}`,
    subtitle: `${shortProjectName(issue.project.name)} · ${issue.status.name}`,
    accessories: [
      {
        icon: Icon.Person,
        text: issue.assigned_to?.name ? shortPersonName(issue.assigned_to.name) : "Unassigned",
        tooltip: issue.assigned_to?.name ?? "Unassigned",
      },
    ],
    keywords: [String(issue.id), issue.subject, issue.project.name, issue.status.name],
    url: `${redmineUrl}/issues/${issue.id}`,
    linkText: `${issue.id}: ${issue.subject}`,
    icon: {
      source: Icon.Circle,
      tintColor: priorityColor(issue.priority.name),
      tooltip: issue.priority.name,
    },
  };
}
