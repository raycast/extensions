import * as miro from "./oauth/miro";
import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import InviteBoard from "./invite-board";
import ListMembers from "./list-member";
import { useCachedPromise } from "@raycast/utils";

export default function ListBoards() {
  const { isLoading, data, revalidate } = useCachedPromise(
    async () => {
      await miro.authorize();
      return await miro.fetchItems();
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

  const { push } = useNavigation();

  return (
    <List isLoading={isLoading}>
      {data.map((item) => {
        return (
          <List.Item
            key={item.id}
            id={item.id}
            icon={Icon.Document}
            title={item.name}
            subtitle={item.description}
            actions={
              <ActionPanel>
                {item.viewLink && (
                  <>
                    <Action.OpenInBrowser url={item.viewLink} />
                    <Action.CopyToClipboard title="Copy URL" content={item.viewLink} />
                    <Action
                      title="Invite to Board"
                      icon={Icon.PersonCircle}
                      onAction={() => push(<InviteBoard id={item.id} />)}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                    />
                    <Action
                      title={"Show board members"}
                      icon={Icon.PersonCircle}
                      onAction={() => push(<ListMembers id={item.id} />)}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                    />
                    <Action title="Reload" onAction={() => revalidate()} shortcut={{ modifiers: ["cmd"], key: "r" }} />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
