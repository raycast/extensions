import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchType,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";

import { getList, updateList } from "@/api/list";
import SearchTasks from "@/components/SearchTasks";
import UpdateList from "@/components/UpdateList";
import { ListObject } from "@/types/list";
import { CachedPromiseMutateType } from "@/types/utils";
import { WorkspaceObject } from "@/types/workspace";
import { isHeightInstalled } from "@/utils/application";

type Props = {
  list: ListObject;
  mutateList: CachedPromiseMutateType<typeof getList>;
  workspace?: WorkspaceObject;
};

export default function ActionsList({ list, mutateList, workspace }: Props) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Show Tasks" icon={Icon.List} onAction={() => push(<SearchTasks listId={list.id} />)} />
        {isHeightInstalled ? (
          <Action.Open
            title="Open List in Height App"
            icon={"height-app.png"}
            target={`${workspace?.url?.replace("https", "height")}/${list.name}`}
            application="Height"
          />
        ) : (
          <Action.OpenInBrowser title="Open List in Browser" icon={Icon.Globe} url={list.url} />
        )}
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
                    await mutateList(updateList(list.id, { archivedAt: new Date().toISOString() }));

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
