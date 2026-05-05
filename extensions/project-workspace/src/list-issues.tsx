import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { IssueActions } from "./components/issue-actions";
import { IssueForm } from "./components/issue-form";
import { loadIssues, loadLabels } from "./issue-data";
import { ISSUE_STATUSES, Issue, IssueLabel, IssueStatus, PRIORITY_CONFIG, STATUS_CONFIG } from "./issue-types";
import { loadHydratedProjectCache } from "./project-records";
import { loadStorageState } from "./storage";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  "no-priority": 4,
};

export default function Command() {
  const { push } = useNavigation();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [labels, setLabels] = useState<IssueLabel[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const refresh = useCallback(() => {
    setIssues(loadIssues());
    setLabels(loadLabels());
  }, []);

  useEffect(() => {
    refresh();
    void (async () => {
      try {
        const storageState = await loadStorageState();
        const projects = await loadHydratedProjectCache(storageState);
        const map: Record<string, string> = {};
        for (const p of projects) {
          map[p.path] = p.displayName ?? p.directoryName;
        }
        setProjectsMap(map);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refresh]);

  const filtered = statusFilter === "all" ? issues : issues.filter((i) => i.status === statusFilter);

  const grouped = Object.fromEntries(ISSUE_STATUSES.map((s) => [s, [] as Issue[]])) as Record<IssueStatus, Issue[]>;
  for (const issue of filtered) {
    grouped[issue.status].push(issue);
  }
  for (const status of ISSUE_STATUSES) {
    grouped[status].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }

  function handleCreate() {
    push(<IssueForm onSave={refresh} />);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search issues by title, ID, label, or project"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Status" onChange={(val) => setStatusFilter(val as IssueStatus | "all")}>
          <List.Dropdown.Item title="All Statuses" value="all" />
          <List.Dropdown.Section>
            {ISSUE_STATUSES.map((s) => (
              <List.Dropdown.Item key={s} title={STATUS_CONFIG[s].label} value={s} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={issues.length === 0 ? "No issues yet" : "No matching issues"}
        description={
          issues.length === 0
            ? "Press ⌘N to create your first issue"
            : "Try adjusting the status filter or search query"
        }
        icon={issues.length === 0 ? Icon.List : Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              title="Create Issue"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={handleCreate}
            />
          </ActionPanel>
        }
      />
      {ISSUE_STATUSES.map((status) => {
        const sectionIssues = grouped[status];
        if (sectionIssues.length === 0) return null;
        return (
          <List.Section key={status} title={STATUS_CONFIG[status].label} subtitle={String(sectionIssues.length)}>
            {sectionIssues.map((issue) => (
              <IssueListItem
                key={issue.id}
                issue={issue}
                labels={labels}
                projectsMap={projectsMap}
                isShowingDetail={isShowingDetail}
                onRefresh={refresh}
                onCreateNew={handleCreate}
                onToggleDetail={() => setIsShowingDetail((v) => !v)}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

interface IssueListItemProps {
  issue: Issue;
  labels: IssueLabel[];
  projectsMap: Record<string, string>;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onCreateNew: () => void;
  onToggleDetail: () => void;
}

function IssueListItem({
  issue,
  labels,
  projectsMap,
  isShowingDetail,
  onRefresh,
  onCreateNew,
  onToggleDetail,
}: IssueListItemProps) {
  const projectName = issue.projectPath ? projectsMap[issue.projectPath] : undefined;

  const accessories: List.Item.Accessory[] = isShowingDetail
    ? []
    : [
        ...issue.labels.slice(0, 2).map((l) => ({ tag: { value: l, color: Color.Blue } })),
        ...(projectName ? [{ text: { value: projectName, color: Color.SecondaryText } }] : []),
        { text: { value: formatRelativeDate(issue.completedAt ?? issue.updatedAt), color: Color.SecondaryText } },
      ];

  const keywords = [
    issue.id,
    issue.title,
    ...issue.labels,
    projectName ?? "",
    STATUS_CONFIG[issue.status].label,
    PRIORITY_CONFIG[issue.priority].label,
  ].filter(Boolean);

  return (
    <List.Item
      id={issue.id}
      icon={PRIORITY_CONFIG[issue.priority].icon}
      title={issue.title}
      subtitle={issue.id}
      accessories={accessories}
      keywords={keywords}
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            markdown={buildDetailMarkdown(issue)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="ID" text={issue.id} />
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={STATUS_CONFIG[issue.status].label}
                  icon={STATUS_CONFIG[issue.status].icon}
                />
                <List.Item.Detail.Metadata.Label
                  title="Priority"
                  text={PRIORITY_CONFIG[issue.priority].label}
                  icon={PRIORITY_CONFIG[issue.priority].icon}
                />
                {issue.labels.length > 0 && (
                  <List.Item.Detail.Metadata.TagList title="Labels">
                    {issue.labels.map((l) => (
                      <List.Item.Detail.Metadata.TagList.Item key={l} text={l} color={Color.Blue} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                )}
                {projectName ? (
                  <List.Item.Detail.Metadata.Label title="Project" text={projectName} icon={Icon.Folder} />
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Created" text={formatAbsoluteDate(issue.createdAt)} />
                {issue.completedAt ? (
                  <List.Item.Detail.Metadata.Label
                    title="Completed"
                    text={formatAbsoluteDate(issue.completedAt)}
                    icon={Icon.Checkmark}
                  />
                ) : null}
                <List.Item.Detail.Metadata.Label title="Updated" text={formatAbsoluteDate(issue.updatedAt)} />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <IssueActions
          issue={issue}
          labels={labels}
          onRefresh={onRefresh}
          onCreateNew={onCreateNew}
          onToggleDetail={onToggleDetail}
        />
      }
    />
  );
}

function buildDetailMarkdown(issue: Issue): string {
  const lines: string[] = [`# ${issue.title}`];
  if (issue.description?.trim()) {
    lines.push("", issue.description);
  } else {
    lines.push("", "*No description provided.*");
  }
  return lines.join("\n");
}

function formatRelativeDate(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatAbsoluteDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
