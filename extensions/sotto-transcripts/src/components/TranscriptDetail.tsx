import { Action, ActionPanel, Clipboard, Detail, Icon, closeMainWindow, showHUD } from "@raycast/api";
import { formatCost } from "../util/format-cost";
import { formatDuration } from "../util/format-duration";
import { formatRelativeDate } from "../util/relative-date";
import type { Entry } from "../util/types";

interface TranscriptDetailProps {
  entry: Entry;
}

export function TranscriptDetail({ entry }: TranscriptDetailProps) {
  const dateLabel = formatRelativeDate(entry.startedAt);
  const markdown = `# ${dateLabel}\n\n${entry.transcript}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Recorded" text={dateLabel} />
          <Detail.Metadata.Label title="Duration" text={formatDuration(entry.duration)} />
          <Detail.Metadata.Label title="Words" text={entry.wordCount.toLocaleString("en-US")} />
          <Detail.Metadata.Label title="Cost" text={formatCost(entry.costUSD)} />
          {entry.model ? <Detail.Metadata.Label title="Model" text={entry.model} /> : null}
          {entry.source ? <Detail.Metadata.Label title="Source" text={entry.source} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Transcript" content={entry.transcript} />
          <Action
            title="Paste to Active App"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              await Clipboard.paste(entry.transcript);
              await closeMainWindow();
              await showHUD("Pasted transcript");
            }}
          />
          {entry.filePath ? <Action.ShowInFinder path={entry.filePath} /> : null}
          {entry.filePath ? (
            <Action.Open
              title="Play Audio"
              target={entry.filePath}
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
