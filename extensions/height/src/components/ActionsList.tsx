import {
  useNavigation,
  ActionPanel,
  Action,
  Icon,
  launchCommand,
  LaunchType,
  confirmAlert,
  Color,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { ApiList } from "../api/list";
import { ListObject } from "../types/list";
import { UseCachedPromiseMutatePromise, ApiResponse } from "../types/utils";
import SearchTasks from "./SearchTasks";
import UpdateList from "./UpdateList";

type Props = {
  list: ListObject;
  mutateList: UseCachedPromiseMutatePromise<ApiResponse<ListObject[]>>;
};

export default function ActionsList({ list, mutateList }: Props) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Show Tasks" icon={Icon.List} onAction={() => push(<SearchTasks listId={list.id} />)} />
        <Action.OpenInBrowser title="Open List in Browser" url={list.url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Create List"
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={async () => {
            await launchCommand({ name: "create_list", type: LaunchType.UserInitiated });
          }}
        />
        <Action
          title="Edit List"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => push(<UpdateList list={list} mutateList={mutateList} />)}
        />
        <Action
          title="Archive List"
          icon={Icon.Tray}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            await confirmAlert({
              title: "Archive List",
              message: "Are you sure you want to archive this list?",
              icon: {
                source: Icon.Tray,
                tintColor: Color.Red,
              },
              primaryAction: {
                title: "Archive",
                style: Alert.ActionStyle.Destructive,
                onAction: async () => {
                  const toast = await showToast({ style: Toast.Style.Animated, title: "Archiving list" });
                  try {
                    await mutateList(ApiList.update(list.id, { archivedAt: new Date().toISOString() }));

                    toast.style = Toast.Style.Success;
                    toast.title = "Successfully archived list 🎉";
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to archive list 😥";
                    toast.message = error instanceof Error ? error.message : undefined;
                  }
                },
              },
            });
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy List Name"
          shortcut={{ modifiers: ["cmd"], key: "." }}
          icon={Icon.CopyClipboard}
          content={list.name}
        />
        <Action.CopyToClipboard
          title="Copy List URL"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          icon={Icon.CopyClipboard}
          content={list.url}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
