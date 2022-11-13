import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import ChangeRole from "./change-role";
import { capitalizeFirstLetter } from "./helpers";
import * as miro from "./oauth/miro";

export default function ListMembers({ id }: { id: string }) {
  const { isLoading, data, revalidate } = useCachedPromise(
    async () => {
      await miro.authorize();
      return await miro.getBoardMembers(id);
    },
    [],
    {
      initialData: [],
      onError: async (error) => {
        console.error(error);
        await showToast({ style: Toast.Style.Failure, title: String(error) });
      },
    }
  );

  const { push, pop } = useNavigation();

  return (
    <List isLoading={isLoading}>
      {data.map((member) => {
        return (
          <List.Item
            key={member.id}
            id={member.id.toString()}
            icon={Icon.Person}
            title={member.name}
            subtitle={member.role ? capitalizeFirstLetter(member.role) : "No role"}
            actions={
              <ActionPanel>
                <Action
                  title="Change role"
                  icon={Icon.PersonCircle}
                  onAction={() => push(<ChangeRole {...{ id, memberId: member.id.toString(), role: member.role }} />)}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
                <Action
                  title={"Remove from board"}
                  icon={Icon.RemovePerson}
                  onAction={async () => {
                    const options: Alert.Options = {
                      title: "Remove Member",
                      message: "Are you sure you want to remove this member?",
                      primaryAction: {
                        title: "Remove",
                        style: Alert.ActionStyle.Destructive,
                        onAction: async () => {
                          try {
                            await miro.removeBoardMember(id, member.id.toString());
                            await showToast({ style: Toast.Style.Success, title: "🎉 Removed member!" });
                            pop();
                          } catch {
                            await showToast({ style: Toast.Style.Failure, title: "Remove member failed." });
                          }
                        },
                      },
                    };
                    await confirmAlert(options);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action title="Reload" onAction={() => revalidate()} shortcut={{ modifiers: ["cmd"], key: "r" }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
