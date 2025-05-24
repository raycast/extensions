import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { format } from "date-fns";
import { useRecordings } from "./hooks";

export default function Command() {
  const { recordings, isLoading, error } = useRecordings();

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          description={error.message}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {recordings?.map((recording) => (
        <List.Item
          key={recording.directory}
          icon={Icon.Document}
          title={format(recording.timestamp, "yyyy/MM/dd HH:mm:ss")}
          detail={
            <List.Item.Detail
              markdown={`
### Raw Result
${recording.meta.rawResult}
${
  recording.meta.llmResult
    ? `
### LLM Result
${recording.meta.llmResult}`
    : ""
}
`}
            />
          }
          actions={
            <ActionPanel>
              <Action.Paste
                title="Paste Result"
                content={recording.meta.llmResult ? recording.meta.llmResult : recording.meta.rawResult}
              />
              <Action.CopyToClipboard
                title="Copy Result"
                content={recording.meta.llmResult ? recording.meta.llmResult : recording.meta.rawResult}
              />
              {recording.meta.llmResult ? (
                <>
                  <Action.Paste
                    title="Paste Raw Result"
                    content={recording.meta.rawResult}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Raw Result"
                    content={recording.meta.rawResult}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
                  />
                </>
              ) : (
                <></>
              )}
              <Action.ShowInFinder
                title="Show in Finder"
                path={join(homedir(), "Documents", "superwhisper", "recordings", recording.directory)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
