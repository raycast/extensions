import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, getAvatarIcon } from "@raycast/utils";
import ChangeRole from "./change-role";
import { capitalizeFirstLetter } from "./helpers";
import * as miro from "./oauth/miro";

export default function ListMembers({ board }: { board: { id: string; name: string } }) {
  const { isLoading, data, mutate } = useCachedPromise(miro.getBoardMembers, [board.id], {
    initialData: [],
  });

  return (
    <List isLoading={isLoading} navigationTitle={board.name}>
      {data.map((member) => {
        return (
          <List.Item
            key={member.id}
            id={member.id.toString()}
            icon={getAvatarIcon(member.name)}
            title={member.name}
            subtitle={member.role ? capitalizeFirstLetter(member.role) : "No role"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Change role"
                  icon={Icon.PersonCircle}
                  target={<ChangeRole board={board} memberId={member.id.toString()} role={member.role} />}
                />
                <ActionPanel.Section>
                  <Action
                    title="Remove from board"
                    icon={Icon.RemovePerson}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      confirmAlert({
                        title: "Remove Member",
                        message: "Are you sure you want to remove this member?",
                        primaryAction: {
                          title: "Remove",
                          style: Alert.ActionStyle.Destructive,
                          onAction: async () => {
                            const toast = await showToast({ style: Toast.Style.Animated, title: "Removing member..." });
                            try {
                              await mutate(miro.removeBoardMember(board.id, member.id.toString()), {
                                optimisticUpdate(data) {
                                  return data.filter((x) => x.id !== member.id);
                                },
                              });
                              await miro.removeBoardMember(board.id, member.id.toString());
                              toast.title = "🎉 Member removed!";
                              toast.style = Toast.Style.Success;
                            } catch (err) {
                              console.error(err);
                              toast.title = "Could not remove member.";
                              toast.message = String(err);
                              toast.style = Toast.Style.Failure;
                            }
                          },
                        },
                      })
                    }
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
