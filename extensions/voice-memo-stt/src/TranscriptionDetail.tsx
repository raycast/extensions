import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { useEffect, useState } from "react";
import { asMarkdown, preferredOutput } from "./outputs";
import type { Recording } from "./types";

export function TranscriptionDetail({ recording }: { recording: Recording }) {
  const output = preferredOutput(recording);
  const [markdown, setMarkdown] = useState<string>();

  useEffect(() => {
    if (!output) {
      setMarkdown("");
      return;
    }
    readFile(output.path, "utf8")
      .then((text) => setMarkdown(asMarkdown(text, output.format)))
      .catch(async (error: Error) => {
        setMarkdown("");
        await showToast({ style: Toast.Style.Failure, title: "Cannot read transcript", message: error.message });
      });
  }, [output?.path]);

  return (
    <Detail
      isLoading={markdown === undefined}
      navigationTitle={recording.title}
      markdown={markdown}
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
          {markdown ? <Action.CopyToClipboard title="Copy Transcript" content={markdown} /> : null}
          {output ? <Action.Open title="Open in Default App" target={output.path} icon={Icon.Pencil} /> : null}
          {output ? <Action.OpenWith title="Open with…" path={output.path} /> : null}
          {output ? <Action.ShowInFinder title="Show in Finder" path={output.path} /> : null}
        </ActionPanel>
      }
    />
  );
}
