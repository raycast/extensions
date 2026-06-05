import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getRuns, projectUrl, runUrl } from "./wandb";

function stateColor(state: string): Color {
  switch (state) {
    case "running":
      return Color.Blue;
    case "finished":
      return Color.Green;
    case "crashed":
    case "failed":
      return Color.Red;
    case "killed":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

function stateIcon(state: string): { source: Icon; tintColor: Color } {
  const source =
    state === "running"
      ? Icon.CircleProgress
      : state === "finished"
        ? Icon.CheckCircle
        : state === "crashed" || state === "failed"
          ? Icon.XMarkCircle
          : state === "killed"
            ? Icon.MinusCircle
            : Icon.Circle;
  return { source, tintColor: stateColor(state) };
}

export function RunList({ token, entity, project }: { token: string; entity: string; project: string }) {
  const [filter, setFilter] = useState("all");

  // Cursor pagination: Raycast loads the next page as the user scrolls, so the
  // full run history is reachable without one large request.
  const {
    data: runs,
    isLoading,
    pagination,
  } = usePromise(
    () =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const res = await getRuns(token, entity, project, { after: cursor });
        return { data: res.runs, hasMore: res.hasMore, cursor: res.endCursor ?? undefined };
      },
    [],
  );

  const states = useMemo(() => Array.from(new Set((runs ?? []).map((r) => r.state))).sort(), [runs]);
  const shown = useMemo(
    () => (filter === "all" ? (runs ?? []) : (runs ?? []).filter((r) => r.state === filter)),
    [runs, filter],
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`${entity}/${project}`}
      searchBarPlaceholder="Filter runs…"
      searchBarAccessory={
        <List.Dropdown tooltip="Status" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All statuses" value="all" />
          <List.Dropdown.Section title="Status">
            {states.map((s) => (
              <List.Dropdown.Item key={s} title={s} value={s} icon={{ source: Icon.Dot, tintColor: stateColor(s) }} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No runs"
        description={`No ${filter === "all" ? "" : filter + " "}runs in ${entity}/${project}.`}
      />
      {shown.map((r) => (
        <List.Item
          key={r.id}
          icon={stateIcon(r.state)}
          title={r.displayName || `#${r.name}`}
          subtitle={r.displayName ? `#${r.name}` : undefined}
          accessories={[
            { tag: { value: r.state, color: stateColor(r.state) } },
            { date: new Date(r.createdAt), tooltip: "Created" },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Run" url={runUrl(entity, project, r.name)} />
              <Action.CopyToClipboard title="Copy Run URL" content={runUrl(entity, project, r.name)} />
              <Action.OpenInBrowser title="Open Project" url={projectUrl(entity, project)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
