import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runPosJSON, type StatusRow } from "../lib/pos";
import { groupByFocus } from "../lib/palette";
import { confirmAndLoad, toastRun } from "../lib/actions";

/** Project list, optionally narrowed to a single focus. Shared by the
 *  "Project Status" command and the focus drill-down. */
export function ProjectList({ focus }: { focus?: string }) {
  const { isLoading, data, revalidate } = usePromise(() =>
    runPosJSON<StatusRow[]>(["status", "--json"]),
  );
  const rows = (data ?? []).filter((r) => !focus || r.focus === focus);
  const groups = groupByFocus(rows);
  const nav = focus ? `Projects · ${focus}` : "Projects";

  return (
    <List
      isLoading={isLoading}
      navigationTitle={nav}
      searchBarPlaceholder="Filter projects…"
    >
      {[...groups.entries()].map(([f, items]) => (
        <List.Section key={f} title={f} subtitle={`${items.length}`}>
          {items.map((r) => (
            <List.Item
              key={`${r.focus}/${r.project}`}
              title={r.project}
              subtitle={r.branch ?? "—"}
              accessories={
                r.dirty
                  ? [
                      {
                        tag: { value: "dirty", color: Color.Yellow },
                        icon: Icon.Dot,
                      },
                    ]
                  : [{ icon: { source: Icon.Check, tintColor: Color.Green } }]
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Open Project"
                    icon={Icon.Terminal}
                    onAction={() =>
                      toastRun(["p", r.project], `Opened ${r.project}`)
                    }
                  />
                  <Action
                    title="Open Claude Code"
                    icon={Icon.Code}
                    onAction={() =>
                      toastRun(
                        ["cc", r.focus],
                        `Opened Claude Code for ${r.focus}`,
                      )
                    }
                  />
                  <Action
                    title={`Load Focus “${r.focus}”`}
                    icon={Icon.AppWindowGrid2x2}
                    style={Action.Style.Destructive}
                    onAction={() => confirmAndLoad(r.focus)}
                  />
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={r.path}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidate}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        title="No projects"
        description="pos status returned nothing for this view."
      />
    </List>
  );
}
