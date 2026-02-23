import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { format } from "date-fns";
import { getRecordingPrimaryText, useRecordings } from "./hooks";

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
      {recordings?.map((recording) => {
        const rawResult = recording.meta.rawResult?.trim() ?? "";
        const llmResult = recording.meta.llmResult?.trim() ?? "";
        const primaryResult = getRecordingPrimaryText(recording.meta);
        const detailMarkdown = llmResult
          ? `### LLM Result
${llmResult}

### Raw Result
${rawResult || "_No raw result available._"}`
          : `### Result
${rawResult || "_No result available._"}`;

        return (
          <List.Item
            key={recording.directory}
            icon={Icon.Document}
            title={format(recording.timestamp, "yyyy/MM/dd HH:mm:ss")}
            detail={<List.Item.Detail markdown={detailMarkdown} />}
            actions={
              <ActionPanel>
                {primaryResult ? (
                  <>
                    <Action.Paste title="Paste Result" content={primaryResult} />
                    <Action.CopyToClipboard title="Copy Result" content={primaryResult} />
                  </>
                ) : null}
                {llmResult ? (
                  <>
                    <Action.Paste
                      title="Paste Raw Result"
                      content={rawResult}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Raw Result"
                      content={rawResult}
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
        );
      })}
    </List>
  );
}
