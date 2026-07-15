import os from "node:os";
import { Action, ActionPanel, Form, Icon, Keyboard, List, useNavigation } from "@raycast/api";

function displayPath(path: string): string {
  return path.replace(os.homedir(), "~");
}

function AddRootAction(props: { onAdd: (paths: string[]) => void }) {
  return (
    <Action.Push
      title="Add Folder"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddRootForm onAdd={props.onAdd} />}
    />
  );
}

/**
 * Form with a native folder picker (multi-select) used to add one or more root
 * folders to the search scope.
 */
export function AddRootForm(props: { onAdd: (paths: string[]) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Folders"
            icon={Icon.Plus}
            onSubmit={(values: { folders: string[] }) => {
              props.onAdd(values.folders ?? []);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folders"
        title="Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
        info="Directory search results will be limited to the folders you add here."
      />
    </Form>
  );
}

/**
 * List of configured root folders with actions to add more or remove existing
 * ones. With no folders configured, search defaults to the user's home folder.
 */
export function ManageRoots(props: {
  roots: string[];
  onAdd: (paths: string[]) => void;
  onRemove: (path: string) => void;
}) {
  const { roots, onAdd, onRemove } = props;

  return (
    <List searchBarPlaceholder="Filter folders...">
      <List.EmptyView
        icon={Icon.Folder}
        title="No Search Folders"
        description="Add a folder to scope your search. With none added, search defaults to your Home folder."
        actions={
          <ActionPanel>
            <AddRootAction onAdd={onAdd} />
          </ActionPanel>
        }
      />
      {roots.map((root) => (
        <List.Item
          key={root}
          icon={Icon.Folder}
          title={displayPath(root)}
          actions={
            <ActionPanel>
              <Action
                title="Remove Folder"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => onRemove(root)}
              />
              <AddRootAction onAdd={onAdd} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
