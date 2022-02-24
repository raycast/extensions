import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useNotebooks } from "./useNotebooks";
import { linkDomain } from "./util";
import { clearLocalState } from "./cache";

// noinspection JSUnusedGlobalSymbols
export default function CommandListNotebooks() {
  const { state, notebooksAreLoading } = useNotebooks();

  return (
    <List isLoading={notebooksAreLoading}>
      {state.notebooks.map(notebook => (
        <List.Item
          key={notebook.id}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={notebook.attributes.name}
          subtitle={notebook.attributes.metadata?.type}
          accessoryTitle={notebook.attributes.author?.email}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${linkDomain()}/notebook/${notebook.id}`} />
              <Action icon={Icon.Trash} title="Clear notebooks cache" onAction={() => clearLocalState("notebooks")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
