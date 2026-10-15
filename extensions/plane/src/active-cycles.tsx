import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { format } from "date-fns";
import AuthorizedView from "./components/AuthorizedView";
import ErrorEmptyView from "./components/ErrorEmptyView";
import ChangeWorkspaceAction from "./components/actions/ChangeWorkspaceAction";
import { CycleWorkItemsList } from "./components/CycleWorkItemsList";
import { useActiveCycles } from "./hooks/useCycleWorkItems";
import { formatCycleProgress, getCycleProgress } from "./helpers/cycles";
import { getCycleUrl } from "./helpers/work-items";
import { planeClient } from "./api/auth";

function formatDate(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : format(date, "MMM d");
}

function ActiveCycles() {
  const { data, isLoading, error, revalidate } = useActiveCycles();
  const cycles = data ?? [];
  const slug = planeClient?.workspaceSlug ?? "";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter active cycles">
      {error && cycles.length === 0 ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.ArrowClockwise}
          title="No active cycles"
          description="None of your projects has a cycle running today."
        />
      )}
      {cycles.map(({ cycle, project }) => {
        const progress = getCycleProgress(cycle);
        const start = formatDate(cycle.start_date);
        const end = formatDate(cycle.end_date);
        const url = getCycleUrl(slug, project.id, cycle.id);
        return (
          <List.Item
            key={cycle.id}
            icon={getProgressIcon(progress.percent / 100)}
            title={cycle.name}
            subtitle={`${project.identifier} · ${project.name}`}
            keywords={[project.identifier, project.name]}
            accessories={[
              { text: formatCycleProgress(cycle), tooltip: "Completed or cancelled / total" },
              ...(start && end ? [{ icon: Icon.Calendar, text: `${start} – ${end}` }] : []),
            ]}
            actions={
              <ActionPanel title={cycle.name}>
                <Action.Push
                  title="Open Cycle Work Items"
                  icon={Icon.List}
                  target={
                    <CycleWorkItemsList
                      project={{ id: project.id, identifier: project.identifier, name: project.name }}
                      cycleId={cycle.id}
                      cycleName={cycle.name}
                    />
                  }
                />
                <Action.OpenInBrowser url={url} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
                <ChangeWorkspaceAction />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <AuthorizedView>
      <ActiveCycles />
    </AuthorizedView>
  );
}
