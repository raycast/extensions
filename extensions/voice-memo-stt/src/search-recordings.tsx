import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { listRecordings, transcribe } from "./vmt";
import { VmtError } from "./errors";
import { preferredOutput } from "./outputs";
import { TranscriptionDetail } from "./TranscriptionDetail";
import type { Recording } from "./types";

type Filter = "all" | "transcribed" | "pending";

export default function SearchRecordings() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, error, revalidate } = usePromise(listRecordings, [], { failureToastOptions: { title: "" } });

  const recordings = (data ?? []).filter((r) =>
    filter === "all" ? true : filter === "transcribed" ? r.transcribed : !r.transcribed,
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recordings…"
      searchBarAccessory={<FilterDropdown onChange={setFilter} />}
    >
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        recordings.map((recording) => <RecordingItem key={recording.id} recording={recording} onChanged={revalidate} />)
      )}
    </List>
  );
}

function FilterDropdown({ onChange }: { onChange: (filter: Filter) => void }) {
  return (
    <List.Dropdown tooltip="Filter" storeValue onChange={(value) => onChange(value as Filter)}>
      <List.Dropdown.Item title="All Recordings" value="all" />
      <List.Dropdown.Item title="Transcribed" value="transcribed" />
      <List.Dropdown.Item title="Not Transcribed" value="pending" />
    </List.Dropdown>
  );
}

function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const detail = error instanceof VmtError ? error.detail : undefined;
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title={error.message}
      description={detail}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function accessories(recording: Recording): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  if (recording.chars > 0) {
    items.push({ text: `${recording.chars.toLocaleString()} chars` });
  }
  items.push({ text: recording.duration_formatted });
  items.push({ date: new Date(recording.date), tooltip: new Date(recording.date).toLocaleString() });
  return items;
}

function statusIcon(recording: Recording) {
  return recording.transcribed
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function RecordingItem({ recording, onChanged }: { recording: Recording; onChanged: () => void }) {
  const output = preferredOutput(recording);

  async function runTranscription(overwrite = false) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Transcribing…",
      message: recording.title,
    });
    try {
      await transcribe(recording.path, { overwrite });
      toast.style = Toast.Style.Success;
      toast.title = "Transcribed";
      onChanged();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = error instanceof Error ? error.message : "Transcription failed";
      toast.message = error instanceof VmtError ? error.detail : undefined;
    }
  }

  // Re-transcription replaces every output, edits included, and is billed
  // again, so it always asks first.
  async function transcribeAgain() {
    const confirmed = await confirmAlert({
      title: "Transcribe again?",
      message:
        "Every output of this recording, including your edits, will be replaced, and the full duration is billed again.",
      primaryAction: { title: "Transcribe Again", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await runTranscription(true);
    }
  }

  return (
    <List.Item
      icon={statusIcon(recording)}
      title={recording.title}
      subtitle={recording.path}
      keywords={[recording.path]}
      accessories={accessories(recording)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {output ? (
              <Action.Push
                title="View Transcript"
                icon={Icon.Text}
                target={<TranscriptionDetail recording={recording} />}
              />
            ) : (
              <Action title="Transcribe" icon={Icon.Microphone} onAction={() => runTranscription()} />
            )}
            {output ? (
              <Action.CopyToClipboard
                title="Copy Transcript"
                content={{ file: output.path }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {output ? (
              <Action.Open
                title="Open in Default App"
                icon={Icon.Pencil}
                target={output.path}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            ) : null}
            {output ? <Action.OpenWith title="Open with…" path={output.path} /> : null}
            {output ? (
              <Action.ShowInFinder
                title="Show Transcript in Finder"
                path={output.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            ) : null}
            <Action.ShowInFinder title="Show Recording in Finder" path={recording.audio_path} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {output ? <Action title="Transcribe Again" icon={Icon.ArrowClockwise} onAction={transcribeAgain} /> : null}
            <Action.CopyToClipboard
              title="Copy Recording Name"
              content={recording.path}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action title="Refresh" icon={Icon.RotateClockwise} onAction={onChanged} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
