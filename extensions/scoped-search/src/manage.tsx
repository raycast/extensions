import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  addScopes,
  loadScopes,
  moveScope,
  prettyPath,
  removeScope,
  toggleScope,
} from "./scopes";

type AddFormValues = {
  folders: string[];
  manualPath: string;
};

function AddScopeForm(props: { onDone: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: AddFormValues) {
    const candidates = [
      ...(values.folders ?? []),
      ...(values.manualPath ?? "").split(","),
    ]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (candidates.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pick a folder first",
      });
      return;
    }

    const { added, duplicates } = await addScopes(candidates);

    if (added.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Already in the list",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title:
        added.length === 1 ? "Folder added" : `${added.length} folders added`,
      message:
        duplicates.length > 0
          ? `${duplicates.length} already existed`
          : undefined,
    });

    props.onDone();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Folder"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Only the folders listed here are ever searched. Nothing else on the disk is touched." />
      <Form.FilePicker
        id="folders"
        title="Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField
        id="manualPath"
        title="Or Type a Path"
        placeholder="~/Desktop/projects"
        info="Comma-separate several paths. A leading ~ is expanded to your home folder."
      />
    </Form>
  );
}

export default function ManageSearchFolders() {
  const {
    data: scopes,
    isLoading,
    revalidate,
  } = useCachedPromise(loadScopes, [], { initialData: [] });

  async function handleRemove(path: string) {
    const confirmed = await confirmAlert({
      title: "Remove this folder?",
      message: `${prettyPath(path)} will no longer be searched. The folder itself is not touched.`,
      icon: Icon.Trash,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeScope(path);
    revalidate();
    await showToast({ style: Toast.Style.Success, title: "Removed" });
  }

  const addAction = (
    <Action.Push
      title="Add Folder"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddScopeForm onDone={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter search folders...">
      <List.EmptyView
        icon={Icon.Folder}
        title="No search folders yet"
        description="Add a folder and Scoped Search will only ever look inside it."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {(scopes ?? []).map((scope, index) => (
        <List.Item
          key={scope.path}
          icon={
            scope.enabled
              ? { source: Icon.Folder, tintColor: Color.Blue }
              : Icon.Folder
          }
          title={prettyPath(scope.path)}
          accessories={[
            scope.enabled
              ? { tag: { value: "Active", color: Color.Green } }
              : { tag: { value: "Paused", color: Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={
                    scope.enabled ? "Pause This Folder" : "Activate This Folder"
                  }
                  icon={scope.enabled ? Icon.Pause : Icon.Play}
                  onAction={async () => {
                    await toggleScope(scope.path);
                    revalidate();
                  }}
                />
                {addAction}
                <Action
                  title="Remove Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleRemove(scope.path)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.ShowInFinder path={scope.path} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={scope.path}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Move up"
                  icon={Icon.ArrowUp}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={async () => {
                    if (index === 0) return;
                    await moveScope(scope.path, -1);
                    revalidate();
                  }}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                  onAction={async () => {
                    await moveScope(scope.path, 1);
                    revalidate();
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
