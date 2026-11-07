import { Action, ActionPanel, Clipboard, Color, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorView, openRecordistWithHUD } from "./lib/app";
import {
  actionItemsText,
  duration,
  longDate,
  meetingMarkdown,
  notesMarkdown,
  sourceLabel,
  statusLabel,
  title,
  transcriptMarkdown,
} from "./lib/format";
import {
  getMeeting,
  getMeetingMarkdown,
  getTranscript,
  listMeetings,
  type Meeting,
  type MeetingSummary,
} from "./lib/recordist";

const quiet = () => undefined;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useCachedPromise(listMeetings, [searchText], { keepPreviousData: true, onError: quiet });
  const detail = useCachedPromise(getMeeting, [selectedId ?? ""], { execute: Boolean(selectedId), onError: quiet });
  const meetings = list.data ?? [];
  const selected = detail.data && detail.data.id === selectedId ? detail.data : undefined;

  return (
    <List
      isLoading={list.isLoading}
      isShowingDetail={meetings.length > 0 && !list.error}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search what was said, or a meeting's title"
    >
      {list.error ? (
        <ErrorView error={list.error} onRetry={list.revalidate} />
      ) : !list.isLoading && meetings.length === 0 ? (
        <List.EmptyView
          icon={Icon.Microphone}
          title={searchText ? "No meeting matches" : "No meetings yet"}
          description={searchText ? "Try other words." : "Record a call in Recordist and it appears here."}
          actions={
            <ActionPanel>
              <Action title="Open Recordist" icon={Icon.AppWindow} onAction={openRecordistWithHUD} />
            </ActionPanel>
          }
        />
      ) : (
        meetings.map((m) => (
          <List.Item
            key={m.id}
            id={m.id}
            title={title(m)}
            icon={m.status === "recording" ? { source: Icon.Microphone, tintColor: Color.Red } : Icon.Document}
            detail={
              m.id === selectedId ? (
                <MeetingDetail summary={m} meeting={selected} isLoading={detail.isLoading} error={detail.error} />
              ) : (
                <List.Item.Detail isLoading />
              )
            }
            actions={<MeetingActions summary={m} meeting={m.id === selectedId ? selected : undefined} />}
          />
        ))
      )}
    </List>
  );
}

function MeetingDetail({
  summary,
  meeting,
  isLoading,
  error,
}: {
  summary: MeetingSummary;
  meeting?: Meeting;
  isLoading: boolean;
  error?: Error;
}) {
  const markdown = meeting
    ? meetingMarkdown(meeting)
    : error
      ? `# ${title(summary)}\n\n_Recordist could not show this meeting: ${error.message}_`
      : `# ${title(summary)}`;
  const people = summary.attendees.map((a) => a.name).filter(Boolean);
  const source = sourceLabel(summary.source_app);
  const length = duration(summary.duration_ms);
  const status = statusLabel(summary.status);
  return (
    <List.Item.Detail
      isLoading={isLoading && !meeting}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Date" text={longDate(summary.started_at)} />
          {summary.starred ? <List.Item.Detail.Metadata.Label title="Starred" icon={Icon.Star} /> : null}
          {length ? <List.Item.Detail.Metadata.Label title="Length" text={length} /> : null}
          {source ? <List.Item.Detail.Metadata.Label title="Call App" text={source} /> : null}
          {people.length ? <List.Item.Detail.Metadata.Label title="People" text={people.join(", ")} /> : null}
          {summary.tags.length ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {summary.tags.map((t) => (
                <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {status ? <List.Item.Detail.Metadata.Label title="Status" text={status} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function MeetingActions({ summary, meeting }: { summary: MeetingSummary; meeting?: Meeting }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="Show Transcript"
          icon={Icon.Text}
          target={<Transcript id={summary.id} meetingTitle={title(summary)} />}
        />
        {meeting ? <Action.CopyToClipboard title="Copy Notes" content={notesMarkdown(meeting)} /> : null}
        {meeting && meeting.action_items.length ? (
          <Action.CopyToClipboard
            title="Copy Action Items"
            content={actionItemsText(meeting)}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "a" },
              Windows: { modifiers: ["ctrl", "shift"], key: "a" },
            }}
          />
        ) : null}
        <Action
          title="Copy Meeting as Markdown"
          icon={Icon.Clipboard}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "m" },
            Windows: { modifiers: ["ctrl", "shift"], key: "m" },
          }}
          onAction={() => copyMeetingMarkdown(summary.id)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Open Recordist"
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={openRecordistWithHUD}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function copyMeetingMarkdown(id: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying the meeting" });
  try {
    await Clipboard.copy(await getMeetingMarkdown(id));
    toast.style = Toast.Style.Success;
    toast.title = "Copied the meeting as Markdown";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not copy the meeting";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

function Transcript({ id, meetingTitle }: { id: string; meetingTitle: string }) {
  const { data, isLoading, error } = useCachedPromise(getTranscript, [id], { onError: quiet });
  const markdown = error
    ? `# ${meetingTitle}\n\n_Recordist could not show the transcript: ${error.message}_`
    : data
      ? transcriptMarkdown(meetingTitle, data)
      : "";
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={meetingTitle}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data && data.length ? (
            <Action.CopyToClipboard title="Copy Transcript" content={transcriptMarkdown(meetingTitle, data)} />
          ) : null}
          <Action title="Open Recordist" icon={Icon.AppWindow} onAction={openRecordistWithHUD} />
        </ActionPanel>
      }
    />
  );
}
