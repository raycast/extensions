// Project Folders (Raycast Extension REQ1): the folders that hold a person's Eidos projects, kept as Raycast keeps its
// Script Folders, a list with a folder added or removed at a time, since a preference holds only one.
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { projectsBeneath, shownFolder, withFolders } from "./lib/projects";
import { useProjectFolders } from "./shared";

// Raycast titles the command's own view; a screen pushed from Open Project names itself.
export default function ProjectFolders(props: { navigationTitle?: string }) {
  const { folders, setFolders, isLoading } = useProjectFolders();
  // counted off the render, since a folder on a slow drive takes a while to walk
  const counts = usePromise(
    async (held: string[]) =>
      new Map(
        await Promise.all(held.map(async (folder) => [folder, (await projectsBeneath(folder, 2)).length] as const)),
      ),
    [folders],
    { execute: !isLoading },
  );

  async function remove(folder: string) {
    const sure = await confirmAlert({
      title: `Remove ${shownFolder(folder)}?`,
      message:
        "Its projects leave Open Project and Search Project unless Eidos MD opened them lately. Nothing on disk changes.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!sure) return;
    await setFolders(folders.filter((held) => held !== folder));
    await showToast({ style: Toast.Style.Success, title: "Folder removed" });
  }

  const add = <AddFolders folders={folders} onAdd={setFolders} />;
  return (
    <List
      isLoading={isLoading || counts.isLoading}
      navigationTitle={props.navigationTitle}
      searchBarPlaceholder="Filter project folders"
    >
      <List.EmptyView
        icon={Icon.Folder}
        title="No project folders"
        description="Add the folders that hold your Eidos projects. Each is searched two levels down, beside the projects Eidos MD opened lately."
        actions={
          <ActionPanel>
            <Action.Push title="Add Folder" icon={Icon.Plus} target={add} />
          </ActionPanel>
        }
      />
      {folders.map((folder) => {
        const found = counts.data?.get(folder);
        return (
          <List.Item
            key={folder}
            icon={Icon.Folder}
            title={shownFolder(folder)}
            accessories={found === undefined ? [] : [{ text: found === 1 ? "1 project" : `${found} projects` }]}
            actions={
              <ActionPanel>
                <Action.Push title="Add Folder" icon={Icon.Plus} target={add} shortcut={Keyboard.Shortcut.Common.New} />
                <Action.ShowInFinder path={folder} />
                <Action
                  title="Remove Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(folder)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function AddFolders(props: { folders: string[]; onAdd: (folders: string[]) => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Add Project Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Folders"
            icon={Icon.Plus}
            onSubmit={async (values: { folders: string[] }) => {
              const picked = values.folders ?? [];
              if (picked.length === 0) {
                await showToast({ style: Toast.Style.Failure, title: "Choose a folder first" });
                return;
              }
              await props.onAdd(withFolders(props.folders, picked));
              await showToast({
                style: Toast.Style.Success,
                title: picked.length === 1 ? "Folder added" : `${picked.length} folders added`,
              });
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
      />
      <Form.Description text="Each folder is searched two levels down for Eidos projects." />
    </Form>
  );
}
