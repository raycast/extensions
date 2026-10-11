import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import { instances, links, workspaces } from "./parallex";

export default function OpenWorkspace() {
  const all = workspaces();
  const names = new Map(instances().map((i) => [i.slug, i.name]));
  return (
    <List searchBarPlaceholder="Find a workspace">
      <List.EmptyView
        icon={Icon.Layers}
        title="No workspaces yet"
        description="Make one in Parallex: File › New Workspace."
      />
      {all.map((workspace) => {
        const members = workspace.members.map((slug) => names.get(slug) ?? slug);
        return (
          <List.Item
            key={workspace.id}
            icon={{ source: Icon.Layers, tintColor: workspace.color }}
            title={workspace.name}
            subtitle={members.join(", ")}
            accessories={[{ text: `${members.length} ${members.length === 1 ? "instance" : "instances"}` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Workspace"
                  icon={Icon.ArrowNe}
                  onAction={async () => {
                    await open(links.workspace(workspace.name));
                    await showHUD(`Opening ${workspace.name}`);
                  }}
                />
                <Action.CopyToClipboard title="Copy Link" content={links.workspace(workspace.name)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
