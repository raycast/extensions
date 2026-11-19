import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ListErrorView } from "./components/error-view";
import { copyOrPaste, sentence, showHexFailure } from "./lib/feedback";
import { formatDuration, formatTime, groupByDay } from "./lib/format";
import { hex, hexText, MEETING_START_TIMEOUT_MS } from "./lib/hex";
import { transcriptBody } from "./lib/meetings";
import { DoneReply, Meeting, MeetingListReply } from "./lib/types";

const STATUS_TAGS: Partial<Record<Meeting["status"], { text: string; color: Color }>> = {
  starting: { text: "Starting", color: Color.Orange },
  recording: { text: "Recording", color: Color.Red },
  transcribing: { text: "Transcribing", color: Color.Blue },
  interrupted: { text: "Interrupted", color: Color.Yellow },
  failed: { text: "Failed", color: Color.Red },
};

const MEETING_LIMIT = "200";

const transcriptOf = (id: string) => hexText(["meetings", "show", id, "--md"]);

async function copyOrPasteTranscript(id: string, mode: "copy" | "paste") {
  let markdown: string;
  try {
    markdown = await transcriptOf(id);
  } catch (error) {
    await showHexFailure(error, "Couldn't read the transcript");
    return;
  }
  await copyOrPaste(markdown, mode, "Copied transcript");
}

async function control(args: string[], titles: { changed: string; failed: string }, onDone: () => void) {
  try {
    const reply = await hex<DoneReply>(args, {
      timeoutMs: MEETING_START_TIMEOUT_MS,
    });
    await showToast({
      style: Toast.Style.Success,
      title: reply.changed ? titles.changed : sentence(reply.message),
    });
    onDone();
  } catch (error) {
    await showHexFailure(error, titles.failed);
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error, revalidate } = usePromise(
    () => hex<MeetingListReply>(["meetings", "list", "--limit", MEETING_LIMIT]),
    [],
    { onError: () => undefined },
  );

  const sections = useMemo(() => groupByDay(data?.meetings ?? [], (meeting) => new Date(meeting.timestamp_ms)), [data]);
  const meetings = data?.meetings ?? [];
  const canStop = meetings.some((meeting) => meeting.status === "recording" || meeting.status === "starting");
  const transcribing = meetings.some((meeting) => meeting.status === "transcribing");

  const recordAction = canStop ? (
    <Action
      title="Stop & Transcribe Meeting"
      icon={Icon.Stop}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={() =>
        control(
          ["meetings", "stop"],
          {
            changed: "Transcribing meeting",
            failed: "Couldn't stop recording the meeting",
          },
          revalidate,
        )
      }
    />
  ) : transcribing ? undefined : (
    <Action
      title="Record Meeting"
      icon={Icon.Microphone}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={() =>
        control(
          ["meetings", "record"],
          { changed: "Recording meeting", failed: "Couldn't record a meeting" },
          revalidate,
        )
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      filtering
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search meetings by title or app"
    >
      {error ? (
        <ListErrorView error={error} onRetry={revalidate} />
      ) : isLoading ? null : (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title={searchText ? "No matching meetings" : "No meetings yet"}
          description={searchText ? undefined : "Record a meeting in Hex."}
          actions={recordAction && <ActionPanel>{recordAction}</ActionPanel>}
        />
      )}
      {sections.map((section, index) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={index === 0 && data?.truncated ? `Latest ${MEETING_LIMIT} meetings` : undefined}
        >
          {section.items.map((meeting) => {
            const date = new Date(meeting.timestamp_ms);
            const tag = STATUS_TAGS[meeting.status];
            return (
              <List.Item
                key={meeting.id}
                icon={meeting.in_progress ? { source: Icon.CircleFilled, tintColor: Color.Red } : Icon.TwoPeople}
                title={meeting.title || "Untitled meeting"}
                subtitle={meeting.application ?? undefined}
                keywords={meeting.application ? [meeting.application] : undefined}
                accessories={[
                  ...(tag ? [{ tag: { value: tag.text, color: tag.color } }] : []),
                  {
                    text: formatDuration(meeting.duration_ms),
                    tooltip: "Length",
                  },
                  { text: formatTime(date), tooltip: date.toLocaleString() },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Show Transcript"
                        icon={Icon.Text}
                        target={<MeetingDetail meeting={meeting} />}
                      />
                      <Action
                        title="Copy Transcript"
                        icon={Icon.CopyClipboard}
                        onAction={() => copyOrPasteTranscript(meeting.id, "copy")}
                      />
                      <Action
                        title="Paste Transcript"
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                        onAction={() => copyOrPasteTranscript(meeting.id, "paste")}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {recordAction}
                      <Action
                        title="Open Hex Meetings"
                        icon={Icon.AppWindow}
                        shortcut={Keyboard.Shortcut.Common.Open}
                        onAction={() =>
                          hex(["window", "show", "meetings"]).catch((error) =>
                            showHexFailure(error, "Couldn't open Hex"),
                          )
                        }
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function MeetingDetail({ meeting }: { meeting: Meeting }) {
  const { data, isLoading, revalidate } = usePromise(transcriptOf, [meeting.id], {
    onError: (error) => showHexFailure(error, "Couldn't read the transcript"),
  });
  const tag = STATUS_TAGS[meeting.status];
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={meeting.title || "Meeting"}
      markdown={data ? transcriptBody(data) : ""}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="When" text={new Date(meeting.timestamp_ms).toLocaleString()} />
          {meeting.application && <Detail.Metadata.Label title="App" text={meeting.application} />}
          <Detail.Metadata.Label title="Length" text={formatDuration(meeting.duration_ms)} />
          {tag && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={tag.text} color={tag.color} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy Transcript"
            icon={Icon.CopyClipboard}
            onAction={() => copyOrPasteTranscript(meeting.id, "copy")}
          />
          <Action
            title="Paste Transcript"
            icon={Icon.Clipboard}
            onAction={() => copyOrPasteTranscript(meeting.id, "paste")}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
