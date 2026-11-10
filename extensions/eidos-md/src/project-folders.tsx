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
import { projectsBeneath, shownFolder, withFolders } from "./lib/projects";
import { useProjectFolders } from "./shared";

export default function ProjectFolders() {
  const { folders, setFolders, isLoading } = useProjectFolders();

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
    <List isLoading={isLoading} navigationTitle="Project Folders" searchBarPlaceholder="Filter project folders">
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
        const found = projectsBeneath(folder, 2).length;
        return (
          <List.Item
            key={folder}
            icon={Icon.Folder}
            title={shownFolder(folder)}
            accessories={[{ text: found === 1 ? "1 project" : `${found} projects` }]}
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
