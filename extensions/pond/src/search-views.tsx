import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { toError } from "./api/problems";
import { ProblemView } from "./components/problem";
import { SavesList } from "./components/saves-list";
import { useViewGroups, useViews } from "./lib/library";
import { viewLink } from "./lib/links";

export default function Command() {
  const views = useViews();
  const groups = useViewGroups();
  const data = views.data ?? [];
  const groupName = new Map((groups.data ?? []).map((group) => [group.id, group.name]));
  const failed = views.error && !data.length ? toError(views.error) : null;
  const sections = [...new Set(data.map((view) => view.parentId))].map((parentId) => ({
    key: parentId ?? "root",
    title: (parentId && groupName.get(parentId)) || "Saved Views",
    views: data.filter((view) => view.parentId === parentId),
  }));

  return (
    <List isLoading={views.isLoading} searchBarPlaceholder="Search saved views…">
      {failed ? (
        <ProblemView error={failed} onRetry={views.revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Eye}
          title="No saved views yet"
          description="Save a search or filter in Pond to reuse it here."
        />
      )}
      {sections.map((section) => (
        <List.Section key={section.key} title={section.title}>
          {section.views.map((view) => (
            <List.Item
              key={view.id}
              title={view.name}
              icon={view.kind === "smart_folder" ? Icon.Wand : Icon.Eye}
              accessories={[{ text: view.kind === "smart_folder" ? "Smart Folder" : "Saved View" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Saves"
                    icon={Icon.List}
                    target={<SavesList filter={{ kind: "view", id: view.id }} navigationTitle={view.name} />}
                  />
                  <Action.Open title="Open in Pond" icon={Icon.AppWindow} target={viewLink(view.id)} />
                  <Action.CopyToClipboard
                    title="Copy Pond Link"
                    content={viewLink(view.id)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CreateQuicklink
                    title="Create Quicklink"
                    quicklink={{ name: `Pond View ${view.name}`, link: viewLink(view.id) }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={views.revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
