import { Detail, ActionPanel, Action } from "@raycast/api";
import type { Block } from "../api/types";
import { useMemo } from "react";

interface TextBlockViewProps {
  block: Block;
}

/** Raycast/CommonMark collapses single newlines; two trailing spaces + newline = hard break. Preserves blank lines between paragraphs. */
function newlinesToMarkdownHardBreaks(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((paragraph) => paragraph.split("\n").join("  \n"))
    .join("\n\n");
}

export function TextBlockView({ block }: TextBlockViewProps) {
  const url = useMemo(() => {
    return block.source?.url || `https://www.are.na/block/${block.id}`;
  }, [block.source, block.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    return formatter.format(date);
  };

  const rawText = typeof block.content === "string" && block.content.trim().length > 0 ? block.content.trimEnd() : "";
  const markdownForDisplay = rawText ? newlinesToMarkdownHardBreaks(rawText) : "No content available";
  const title = typeof block.title === "string" && block.title.trim().length > 0 ? block.title : "Untitled";

  return (
    <Detail
      markdown={markdownForDisplay}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          <Detail.Metadata.Label title="User" text={block.user?.full_name || "Unknown"} />
          <Detail.Metadata.Label title="Created At" text={formatDate(block.created_at)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action.CopyToClipboard
            content={rawText || "No content available"}
            title="Copy Text Content"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard content={url} title="Copy Block URL" shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    />
  );
}
