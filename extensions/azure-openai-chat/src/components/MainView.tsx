import { Action, ActionPanel, Icon, List } from "@raycast/api";
import dayjs from "dayjs";
import { useContext } from "react";
import { IndexContext } from "../context";
import { ShowDtail } from "./ShowDetail";

export function MainView(props: { toggleMainView: () => void }) {
  const { input, setInput, histories, handleSetArchives, handleSetHistories, clearHistories } =
    useContext(IndexContext);

  return (
    <>
      {histories.map((history) => (
        <List.Item
          title={history.prompt || "Ask me anything..."}
          subtitle={dayjs(history.date).format("YY/MM/DD HH:mm:ss")}
          actions={
            <ActionPanel>
              <Action.Push
                title="Ask AI"
                icon={Icon.Stars}
                target={
                  <ShowDtail
                    histories={histories}
                    handleSetHistories={handleSetHistories}
                    prompt={input || history.prompt}
                    date={history.date}
                  />
                }
              ></Action.Push>
              <Action.Push
                title="Regenerate"
                icon={Icon.RotateClockwise}
                target={
                  <ShowDtail
                    histories={histories}
                    handleSetHistories={handleSetHistories}
                    prompt={input || history.prompt}
                    date={dayjs().valueOf()}
                  />
                }
              ></Action.Push>
              <Action
                title="Create New Chat"
                shortcut={{ modifiers: ["opt"], key: "enter" }}
                icon={Icon.Message}
                onAction={() => {
                  if (!histories[0].prompt) return;

                  handleSetArchives(histories);
                  clearHistories();
                }}
              ></Action>
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["opt"], key: "c" }}
                content={history.content}
              ></Action.CopyToClipboard>
              <Action
                title="Rewrite Prompt"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                icon={Icon.TextCursor}
                onAction={() => setInput(history.prompt)}
              ></Action>
              <Action
                title="Toggle Open Archives"
                icon={Icon.Tray}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                onAction={props.toggleMainView}
              ></Action>
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </>
  );
}
