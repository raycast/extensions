import { Action, ActionPanel, Icon, List, open, Keyboard } from "@raycast/api";
import { useMemo } from "react";

import { isOpenIssue, type ProjectIssue } from "../api/project-issues";
import { getIssueStateIcon, getPriorityIcon, getUserAvatar } from "../helpers/icons";
import { getLinearAppUrl } from "../helpers/open-linear";
import { useProjectIssues } from "../hooks/use-project-issues";

function IssueItem({ issue }: { issue: ProjectIssue }) {
  const pullRequests = issue.attachments.nodes.filter(
    (attachment) => attachment.sourceType === "github" || /\/pull\/\d+/i.test(attachment.url),
  );

  return (
    <List.Item
      title={issue.title}
      subtitle={issue.identifier}
      keywords={[issue.identifier, issue.state.name]}
      icon={getIssueStateIcon(issue.state)}
      accessories={[
        ...(pullRequests.length > 0
          ? [{ icon: Icon.CodeBlock, tooltip: `${pullRequests.length} connected PR(s)` }]
          : []),
        { icon: getPriorityIcon(issue.priority), tooltip: "Priority" },
        { icon: getUserAvatar(issue.assignee), tooltip: issue.assignee ? issue.assignee.displayName : "Unassigned" },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Issue in Linear" url={issue.url} icon={Icon.Globe} />
            <Action
              title="Open Issue in Linear App"
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => open(getLinearAppUrl(issue.url))}
            />
          </ActionPanel.Section>

          {pullRequests.length > 0 ? (
            <ActionPanel.Section title="Connected Pull Requests">
              {pullRequests.map((pr) => (
                <Action.OpenInBrowser key={pr.id} title={pr.title || pr.url} url={pr.url} icon={Icon.CodeBlock} />
              ))}
            </ActionPanel.Section>
          ) : null}

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Issue URL"
              content={issue.url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {issue.branchName ? (
              <Action.CopyToClipboard
                title="Copy Branch Name"
                content={issue.branchName}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function ProjectIssuesList({
  projectId,
  projectName,
  initialIssues,
}: {
  projectId: string;
  projectName: string;
  initialIssues: ProjectIssue[];
}) {
  const { issues, isLoadingIssues } = useProjectIssues(projectId);
  const resolvedIssues = issues.length > 0 ? issues : initialIssues;

  const { openIssues, closedIssues } = useMemo(() => {
    return {
      openIssues: resolvedIssues.filter(isOpenIssue),
      closedIssues: resolvedIssues.filter((issue) => !isOpenIssue(issue)),
    };
  }, [resolvedIssues]);

  return (
    <List
      isLoading={isLoadingIssues && resolvedIssues.length === 0}
      navigationTitle={`${projectName} · Issues`}
      searchBarPlaceholder="Filter issues by title, ID, or status"
    >
      <List.Section title="Open" subtitle={`${openIssues.length}`}>
        {openIssues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}
      </List.Section>

      <List.Section title="Closed" subtitle={`${closedIssues.length}`}>
        {closedIssues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}
      </List.Section>

      <List.EmptyView title="No issues" description="This project doesn't have any issues yet." />
    </List>
  );
}
