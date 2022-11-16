import { Action, ActionPanel, List } from "@raycast/api";
import { useNotebooks } from "./useNotebooks";
import { linkDomain } from "./util";

// noinspection JSUnusedGlobalSymbols
export default function CommandListNotebooks() {
  const { notebooks, notebooksAreLoading } = useNotebooks();

  return (
    <List isLoading={notebooksAreLoading}>
      {notebooks.map(notebook => (
        <List.Item
          key={notebook.id}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={notebook.attributes.name}
          subtitle={notebook.attributes.metadata?.type}
          accessories={[{ text: notebook.attributes.author?.email }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${linkDomain()}/notebook/${notebook.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
