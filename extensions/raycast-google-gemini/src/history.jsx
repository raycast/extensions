import { Action, ActionPanel, List } from "@raycast/api";
import { open, Icon, Alert, confirmAlert } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { launchCommand, LaunchType } from "@raycast/api";

export default function History() {
  const [data, setData] = useState();
  const [isLoading, setLoading] = useState(true);

  async function reloadHistory() {
    setLoading(true);
    const storedHistory = await LocalStorage.allItems();
    if (storedHistory) {
      setData(
        Object.entries(storedHistory)
          .sort((a, b) => b[0] - a[0])
          .map((pair) => {
            var [key, dialogue] = pair;
            return [key, JSON.parse(dialogue)];
          }),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await reloadHistory();
    })();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {data &&
        data.map((pair) => {
          var [key, dialogue] = pair;
          const date = new Date(parseInt(key));
          const prop = {
            detail: (
              <List.Item.Detail
                markdown={dialogue.markdown}
                metadata={
                  dialogue.metadata &&
                  dialogue.metadata.length > 0 && (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Extra Context">
                        {dialogue.metadata.map((retrievalObject) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={retrievalObject.href}
                            text={retrievalObject.title}
                            onAction={() => open(retrievalObject.href)}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  )
                }
              />
            ),
          };
          return (
            <List.Item
              key={key}
              title={dialogue.query || ""}
              subtitle={date.toDateString()}
              {...prop}
              actions={
                <ActionPanel>
                  <Action
                    title="Continue"
                    icon={Icon.Reply}
                    onAction={async () => {
                      await launchCommand({
                        name: "ask-ai",
                        type: LaunchType.UserInitiated,
                        context: {
                          chatID: key,
                          markdown: dialogue.markdown,
                          metadata: dialogue.metadata,
                          history: dialogue.history,
                        },
                      });
                    }}
                  />
                  <Action.CopyToClipboard
                    content={dialogue.markdown}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    title="Remove History"
                    onAction={async () => {
                      await confirmAlert({
                        title: "Are you sure you want to remove this answer from your history?",
                        message: "This action cannot be undone",
                        icon: Icon.Trash,
                        primaryAction: {
                          title: "Confirm Remove",
                          style: Alert.ActionStyle.Destructive,
                          onAction: async () => {
                            await LocalStorage.removeItem(key);
                            await reloadHistory();
                          },
                        },
                      });
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                  <Action
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    title="Clear History"
                    onAction={async () => {
                      await confirmAlert({
                        title: "Are you sure you want to remove all the history?",
                        message: "This action cannot be undone",
                        icon: Icon.Trash,
                        primaryAction: {
                          title: "Confirm Clear",
                          style: Alert.ActionStyle.Destructive,
                          onAction: async () => {
                            await LocalStorage.clear();
                            await reloadHistory();
                          },
                        },
                      });
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
