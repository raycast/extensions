import { homedir } from "node:os";
import { Action, ActionPanel, Form, Icon, Keyboard, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

export type Folders = {
  list: string[];
  folder: string | undefined;
  isLoading: boolean;
  choose: (folder: string) => void;
  add: (folder: string) => Promise<void>;
  remove: (folder: string) => void;
};

export function useFolders(): Folders {
  const folders = useLocalStorage<string[]>("folders", []);
  const chosen = useLocalStorage<string>("folder");
  const list = folders.value ?? [];
  return {
    list,
    folder: list.find((folder) => folder === chosen.value) ?? list[0],
    isLoading: folders.isLoading || chosen.isLoading,
    choose: (folder) => void chosen.setValue(folder),
    add: async (folder) => {
      await Promise.all([
        folders.setValue([...list.filter((other) => other !== folder), folder]),
        chosen.setValue(folder),
      ]);
    },
    remove: (folder) => void folders.setValue(list.filter((other) => other !== folder)),
  };
}

export function tilde(path: string): string {
  const home = homedir();
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

export function FolderActions({ folders }: { folders: Folders }) {
  const { folder } = folders;
  return (
    <ActionPanel.Section>
      <Action.Push
        title="Add Folder…"
        icon={Icon.NewFolder}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<AddFolder add={folders.add} />}
      />
      {folder !== undefined && (
        <Action
          title="Remove Folder"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => folders.remove(folder)}
        />
      )}
    </ActionPanel.Section>
  );
}

function AddFolder({ add }: { add: Folders["add"] }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Add Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Folder"
            icon={Icon.NewFolder}
            onSubmit={async ({ folder }: { folder: string[] }) => {
              if (folder.length === 0) return;
              await add(folder[0]);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
