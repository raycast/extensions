import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import Lyrics from "./Lyrics";

export type HistoryItem = {
  title: string;
  thumbnail: string;
  url: string;
  viewedAt: number;
};

export default function History() {
  const {
    value: history,
    setValue: setHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<HistoryItem[]>("history", []);
  return (
    <>
      {!isHistoryLoading &&
        history
          ?.sort((a, b) => b.viewedAt - a.viewedAt)
          .map((item) => (
            <List.Item
              key={item.url}
              title={item.title}
              subtitle={new Date(item.viewedAt).toLocaleString()}
              icon={item.thumbnail}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Lyrics"
                    icon={Icon.Paragraph}
                    target={<Lyrics url={item.url} title={item.title} />}
                    onPush={() => {
                      const existingIdx = history!.findIndex((i) => i.title.toLowerCase() === item.title.toLowerCase());
                      history![existingIdx] = {
                        ...history![existingIdx],
                        viewedAt: Date.now(),
                      };
                      setHistory(history!);
                    }}
                  />
                  <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                  <Action
                    title="Remove from History"
                    icon={{
                      source: Icon.Trash,
                      tintColor: Color.Red,
                    }}
                    style={Action.Style.Destructive}
                    onAction={() => {
                      setHistory(history.filter((i) => i.title.toLowerCase() !== item.title.toLowerCase()));
                    }}
                    shortcut={{
                      modifiers: ["ctrl"],
                      key: "x",
                    }}
                  />
                  <Action
                    title="Clear All History"
                    icon={{
                      source: Icon.Trash,
                      tintColor: Color.Red,
                    }}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Are you sure?",
                          message: "Deleted history is gone forever.",
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                          },
                        })
                      ) {
                        setHistory([]);
                      }
                    }}
                    shortcut={{
                      modifiers: ["ctrl", "shift"],
                      key: "x",
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
    </>
  );
}
