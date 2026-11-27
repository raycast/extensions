import { Action, ActionPanel, Icon, Keyboard, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readdirSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { isMediaFile } from "../lib/files";
import { MACWHISPER_BUNDLE_ID, OutputFormat } from "../lib/mw";
import { transcriptMarkdown } from "./TranscriptDetail";

type Props = {
  /** Transcript files written by `mw transcribe --output-dir`. */
  files: string[];
  format: OutputFormat;
  sourceDir: string;
  outputDir: string;
};

/** `mw` may print a path through a different symlink (`/tmp` vs `/private/tmp`); compare resolved paths. */
function resolved(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function relativeTo(folder: string, path: string): string {
  return relative(resolved(folder), resolved(path));
}

async function readTranscripts(files: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    files.map(async (file) => [file, await readFile(file, "utf8").catch(() => "")] as const),
  );
  return Object.fromEntries(entries);
}

/** The recording a transcript was made from: same relative folder and file name, with a media extension. */
function sourceRecording(file: string, sourceDir: string, outputDir: string): string | undefined {
  const folder = join(sourceDir, relativeTo(outputDir, dirname(file)));
  const name = basename(file, extname(file));
  try {
    const match = readdirSync(folder).find((entry) => isMediaFile(entry) && basename(entry, extname(entry)) === name);
    return match ? join(folder, match) : undefined;
  } catch {
    return undefined;
  }
}

export function BatchResultsView({ files, format, sourceDir, outputDir }: Props) {
  const { data: transcripts, isLoading } = usePromise(readTranscripts, [files]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={files.length > 0}
      navigationTitle={files.length === 1 ? "1 Transcript" : `${files.length} Transcripts`}
      searchBarPlaceholder="Filter transcripts"
    >
      <List.EmptyView
        icon={Icon.Document}
        title="No transcripts written"
        description="MacWhisper found no audio or video files to transcribe in this folder."
        actions={
          <ActionPanel>
            <Action.Open title="Open Source Folder" target={sourceDir} />
          </ActionPanel>
        }
      />
      {files.map((file) => {
        const transcript = transcripts?.[file] ?? "";
        const recording = sourceRecording(file, sourceDir, outputDir);
        return (
          <List.Item
            key={file}
            icon={Icon.Document}
            title={relativeTo(outputDir, file)}
            detail={<List.Item.Detail markdown={transcripts ? transcriptMarkdown(transcript, format) : ""} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Transcript" content={transcript} />
                <Action.Paste title="Paste Transcript" content={transcript} />
                <ActionPanel.Section>
                  <Action.Open title="Open File" target={file} shortcut={Keyboard.Shortcut.Common.Open} />
                  <Action.ShowInFinder path={file} />
                  {recording && (
                    <Action
                      title="Open Recording in MacWhisper"
                      icon={Icon.AppWindow}
                      onAction={() => open(recording, MACWHISPER_BUNDLE_ID)}
                    />
                  )}
                  <Action.Open title="Open Output Folder" icon={Icon.Folder} target={outputDir} />
                  <Action.CopyToClipboard
                    title="Copy File Path"
                    content={file}
                    shortcut={Keyboard.Shortcut.Common.CopyPath}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
