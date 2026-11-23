import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, open, showToast, Toast } from "@raycast/api";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { sidecarPath } from "../lib/files";
import { errorMessage, MACWHISPER_BUNDLE_ID, OutputFormat } from "../lib/mw";

export type TranscriptResult = {
  path: string;
  transcript: string;
};

async function saveNextToSource(result: TranscriptResult, format: OutputFormat) {
  const target = sidecarPath(result.path, format);
  if (existsSync(target)) {
    const confirmed = await confirmAlert({
      title: "Overwrite existing file?",
      message: target,
      primaryAction: { title: "Overwrite", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
  }
  try {
    await writeFile(target, `${result.transcript}\n`, "utf8");
    await showToast({
      style: Toast.Style.Success,
      title: "Transcript saved",
      message: basename(target),
      primaryAction: { title: "Show in Finder", onAction: () => open(dirname(target)) },
    });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not save transcript", message: errorMessage(error) });
  }
}

const NO_SPEECH_MARKDOWN =
  "_No speech detected. The file may contain only music or silence, or need another model or language._";

/** Markdown preview of one transcript: text formats as-is, the others in a code block. */
export function transcriptMarkdown(transcript: string, format: OutputFormat): string {
  if (!transcript.trim()) return NO_SPEECH_MARKDOWN;
  return format === "md" || format === "txt" ? transcript : `\`\`\`${format}\n${transcript}\n\`\`\``;
}

function toMarkdown(results: TranscriptResult[], format: OutputFormat): string {
  return results
    .map((result) => {
      const heading = results.length > 1 ? `## ${basename(result.path)}\n\n` : "";
      return `${heading}${transcriptMarkdown(result.transcript, format)}`;
    })
    .join("\n\n---\n\n");
}

export function combinedTranscript(results: TranscriptResult[]): string {
  if (results.length === 1) return results[0].transcript;
  return results.map((result) => `# ${basename(result.path)}\n\n${result.transcript}`).join("\n\n");
}

export function TranscriptDetail({ results, format }: { results: TranscriptResult[]; format: OutputFormat }) {
  const text = combinedTranscript(results);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    <Detail
      navigationTitle={results.length === 1 ? basename(results[0].path) : `${results.length} Transcripts`}
      markdown={toMarkdown(results, format)}
      metadata={
        <Detail.Metadata>
          {results.map((result) => (
            <Detail.Metadata.Label key={result.path} title="File" text={basename(result.path)} />
          ))}
          <Detail.Metadata.Label title="Format" text={format.toUpperCase()} />
          <Detail.Metadata.Label title="Words" text={String(wordCount)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Transcript" content={text} />
          <Action.Paste title="Paste Transcript" content={text} />
          <ActionPanel.Section>
            {results.map((result) => (
              <Action
                key={result.path}
                title={results.length > 1 ? `Save Next to ${basename(result.path)}` : "Save Next to Source File"}
                icon={Icon.SaveDocument}
                shortcut={results.length === 1 ? { modifiers: ["cmd"], key: "s" } : undefined}
                onAction={() => saveNextToSource(result, format)}
              />
            ))}
            {results.map((result) => (
              <Action
                key={`open-${result.path}`}
                title={results.length > 1 ? `Open ${basename(result.path)} in MacWhisper` : "Open in MacWhisper"}
                icon={Icon.AppWindow}
                onAction={() => open(result.path, MACWHISPER_BUNDLE_ID)}
              />
            ))}
            <Action.ShowInFinder path={results[0].path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
