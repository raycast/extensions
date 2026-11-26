import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import { asMarkdown, preferredOutput } from "./outputs";
import type { Recording } from "./types";

export function TranscriptionDetail({ recording }: { recording: Recording }) {
  const output = preferredOutput(recording);
  const { data: text, isLoading } = usePromise((path: string) => readFile(path, "utf8"), [output?.path ?? ""], {
    execute: output !== undefined,
    failureToastOptions: { title: "Cannot read transcript" },
  });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={recording.title}
      markdown={output && text !== undefined ? asMarkdown(text, output.format) : undefined}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Recorded" text={new Date(recording.date).toLocaleString()} />
          <Detail.Metadata.Label title="Duration" text={recording.duration_formatted} />
          <Detail.Metadata.Label title="Characters" text={recording.chars.toLocaleString()} />
          <Detail.Metadata.Separator />
          {Object.entries(recording.outputs).map(([format, path]) => (
            <Detail.Metadata.Label key={format} title={format} text={path} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {text ? <Action.CopyToClipboard title="Copy Transcript" content={text} /> : null}
          {output ? <Action.Open title="Open in Default App" target={output.path} icon={Icon.Pencil} /> : null}
          {output ? <Action.OpenWith title="Open with…" path={output.path} /> : null}
          {output ? <Action.ShowInFinder title="Show in Finder" path={output.path} /> : null}
        </ActionPanel>
      }
    />
  );
}
