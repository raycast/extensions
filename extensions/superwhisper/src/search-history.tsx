import { List, ActionPanel, Action, Icon, Color, getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { format } from "date-fns";
import { getRecordingPrimaryText, useRecordings } from "./hooks";

export default function Command() {
  const { recordingDir } = getPreferenceValues<Preferences.SearchHistory>();
  const recordingsPath = recordingDir || join(homedir(), "Documents", "superwhisper", "recordings");
  const { recordings, isLoading, error } = useRecordings(recordingsPath);
  const latestHistoryText = recordings?.[0] ? getRecordingPrimaryText(recordings[0].meta) : "";

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
                {latestHistoryText ? (
                  <Action.CopyToClipboard
                    title="Copy Last History"
                    content={latestHistoryText}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />
                ) : null}
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
                ) : null}
                <Action.ShowInFinder
                  title="Show in Finder"
                  path={join(recordingsPath, recording.directory)}
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
