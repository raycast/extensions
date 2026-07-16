import { Action, ActionPanel, Icon, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { contractHome } from "../utils/path";
import { AddRootForm } from "./AddRootForm";

/**
 * In-extension manager for the folders RepoScout searches. Lists folders added
 * via the picker (removable) and folders coming from preferences (read-only),
 * and offers an "Add Folder…" action that pushes {@link AddRootForm}.
 * Presentation only.
 */
export interface ManageRootsViewProps {
  readonly storedRoots: readonly string[];
  readonly preferenceRoots: readonly string[];
  readonly onAdd: (paths: readonly string[]) => void | Promise<void>;
  readonly onRemove: (path: string) => void | Promise<void>;
}

export function ManageRootsView(props: ManageRootsViewProps): React.JSX.Element {
  const { storedRoots, preferenceRoots, onAdd, onRemove } = props;
  const { push } = useNavigation();

  const addAction = (
    <Action
      title="Add Folder…"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => push(<AddRootForm onAdd={onAdd} />)}
    />
  );

  const isEmpty = storedRoots.length === 0 && preferenceRoots.length === 0;

  return (
    <List navigationTitle="Search Folders" searchBarPlaceholder="Filter folders…">
      {isEmpty ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No folders yet"
          description="Add a folder for RepoScout to search for Git repositories."
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      ) : (
        <>
          <List.Section title="Added in RepoScout" subtitle={String(storedRoots.length)}>
            {storedRoots.map((root) => (
              <List.Item
                key={root}
                icon={Icon.Folder}
                title={contractHome(root)}
                actions={
                  <ActionPanel>
                    {addAction}
                    <Action
                      title="Remove Folder"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => onRemove(root)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {preferenceRoots.length > 0 ? (
            <List.Section title="From Preferences" subtitle="Edit in extension preferences">
              {preferenceRoots.map((root) => (
                <List.Item
                  key={root}
                  icon={Icon.Gear}
                  title={contractHome(root)}
                  accessories={[{ text: "preferences" }]}
                  actions={
                    <ActionPanel>
                      {addAction}
                      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}
