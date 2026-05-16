import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { ErrorIssue, listErrorIssues } from "./api/errors";

function Errors() {
  const { selectedId } = useContext(ProjectsContext);

  const { data, isLoading } = useCachedPromise(
    (id: string) => listErrorIssues(id, { status: "active" }).then((r) => r.results.slice(0, 50)),
    [selectedId ?? ""],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => showFailureToast(e, { title: "Couldn't load errors" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search errors..."
      searchBarAccessory={<ProjectSelector />}
      throttle
    >
      <List.Section title="Active Issues">
        {data?.map((issue) => (
          <ErrorIssueItem key={issue.id} issue={issue} />
        ))}
      </List.Section>
      {!isLoading && (!data || data.length === 0) && (
        <List.EmptyView title="No errors" description="Nothing matching the current filter." icon={Icon.CheckCircle} />
      )}
    </List>
  );
}

function ErrorIssueItem({ issue }: { issue: ErrorIssue }) {
  const appUrl = useUrl(`error_tracking/${issue.id}`);
  const subtitle = `${issue.occurrences} occurrences · ${issue.users} users`;
  const accessories: List.Item.Accessory[] = [{ text: issue.status, tooltip: "Status" }];
  if (issue.last_seen) accessories.push({ date: new Date(issue.last_seen), tooltip: "Last seen" });
  return (
    <List.Item
      title={issue.name || "Untitled issue"}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={appUrl} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={appUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Issue ID"
            content={issue.id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <WithProjects>
      <Errors />
    </WithProjects>
  );
}
