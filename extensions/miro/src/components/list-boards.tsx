import { Action, ActionPanel, Alert, Color, confirmAlert, Grid, Icon, showToast, Toast } from "@raycast/api";
import ListMembers from "../list-member";
import InviteBoard from "../invite-board";
import * as miro from "../oauth/miro";
import { Board } from "@mirohq/miro-api";
import { MutatePromise } from "@raycast/utils";

function ListBoards({
  isLoading,
  data,
  mutate,
}: {
  isLoading: boolean;
  data: Board[];
  mutate: MutatePromise<Board[]>;
}) {
  return (
    <Grid isLoading={isLoading}>
      {data.map((item) => {
        return (
          <Grid.Item
            key={item.id}
            id={item.id}
            content={item.picture?.imageURL ?? Color.SecondaryText}
            title={item.name}
            subtitle={item.description}
            actions={
              <ActionPanel>
                {item.viewLink && (
                  <>
                    <Action.OpenInBrowser url={item.viewLink} />
                    <Action.CopyToClipboard title="Copy URL to Board" content={item.viewLink} />
                  </>
                )}
                <ActionPanel.Section>
                  <Action.Push
                    title="Show Board Members"
                    icon={Icon.Person}
                    target={<ListMembers board={item} />}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  />
                  <Action.Push
                    title="Invite to Board"
                    icon={Icon.AddPerson}
                    target={<InviteBoard board={item} />}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Board"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      confirmAlert({
                        title: "Delete Board",
                        message: "Are you sure you want to delete this board?",
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                          onAction: async () => {
                            const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting board..." });
                            try {
                              await mutate(miro.deleteBoard(item.id), {
                                optimisticUpdate(data) {
                                  return data.filter((x) => x.id !== item.id);
                                },
                              });
                              toast.title = "🎉 Board deleted!";
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
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
export default ListBoards;
