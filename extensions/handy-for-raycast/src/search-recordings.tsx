import { Action, ActionPanel, Alert, confirmAlert, Icon, List, trash, Keyboard } from "@raycast/api";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { useEffect, useState } from "react";
import { showFailure } from "./lib/errors";
import { formatBytes } from "./lib/format";
import { getHistory } from "./lib/history";
import { RECORDINGS_DIR } from "./lib/paths";

interface Recording {
  path: string;
  name: string;
  size: number;
  modified: Date;
  title?: string;
  transcript?: string;
  saved?: boolean;
}

function loadRecordings(): Recording[] {
  const byFile = new Map(getHistory().map((entry) => [basename(entry.file_name), entry]));
  if (!existsSync(RECORDINGS_DIR)) return [];
  return readdirSync(RECORDINGS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(wav|mp3|m4a|flac|ogg)$/i.test(entry.name))
    .map((file) => {
      const path = join(RECORDINGS_DIR, file.name);
      const stat = statSync(path);
      const history = byFile.get(file.name);
      return {
        path,
        name: file.name,
        size: stat.size,
        modified: stat.mtime,
        title: history?.title,
        transcript: history?.post_processed_text || history?.transcription_text,
        saved: history?.saved,
      };
    })
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

export default function Command() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      setRecordings(loadRecordings());
    } catch (error) {
      await showFailure("Could not read Handy recordings", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function remove(recording: Recording) {
    const okay = await confirmAlert({
      title: "Move this audio file to the Trash?",
      message: recording.transcript ? "The transcript stays in Handy history." : undefined,
      primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
    });
    if (!okay) return;
    try {
      await trash(recording.path);
      setRecordings((items) => items.filter((item) => item.path !== recording.path));
    } catch (error) {
      await showFailure("Could not trash recording", error);
    }
  }
  return (
    <List isLoading={loading} isShowingDetail searchBarPlaceholder="Search recordings and transcript text…">
      {!loading && !recordings.length ? (
        <List.EmptyView
          icon={Icon.Waveform}
          title="No Recordings Found"
          description="Handy has no audio recordings on disk."
          actions={
            <ActionPanel>
              <Action.ShowInFinder title="Open Recordings Folder" path={RECORDINGS_DIR} />
            </ActionPanel>
          }
        />
      ) : (
        recordings.map((recording) => (
          <List.Item
            key={recording.path}
            icon={Icon.Waveform}
            title={recording.title || recording.name}
            subtitle={recording.title ? recording.name : recording.transcript?.slice(0, 90)}
            keywords={[recording.name, recording.transcript || ""]}
            accessories={[
              ...(recording.saved ? [{ icon: Icon.Star }] : []),
              { text: formatBytes(recording.size) },
              { date: recording.modified },
            ]}
            detail={
              <List.Item.Detail
                markdown={
                  recording.transcript
                    ? `## Transcript\n\n${recording.transcript}`
                    : "_No transcript is linked to this recording._"
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="File" text={recording.name} />
                    <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(recording.size)} />
                    <List.Item.Detail.Metadata.Label title="Modified" text={recording.modified.toLocaleString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Open title="Play Recording" target={recording.path} icon={Icon.Play} />
                <Action.ShowInFinder path={recording.path} />
                {recording.transcript && (
                  <Action.CopyToClipboard title="Copy Transcript" content={recording.transcript} />
                )}
                <Action.ShowInFinder title="Open Recordings Folder" path={RECORDINGS_DIR} />
                <Action
                  title="Move Audio to Trash"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(recording)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={load}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
