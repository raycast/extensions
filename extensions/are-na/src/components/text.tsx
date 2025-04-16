import { Detail, ActionPanel, Action } from "@raycast/api";
import type { Block } from "../api/types";
import { useMemo } from "react";

interface TextBlockViewProps {
  block: Block;
}

export function TextBlockView({ block }: TextBlockViewProps) {
  const url = useMemo(() => {
    return block.source?.url || `https://www.are.na/blocks/${block.id}`;
  }, [block.source, block.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Detail
      markdown={block.content ?? "No content available"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={block.title || "Untitled"} />
          <Detail.Metadata.Label title="User" text={block.user?.full_name || "Unknown"} />
          <Detail.Metadata.Label title="Created At" text={formatDate(block.created_at)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard content={block.content || ""} title="Copy Text Content" />
          <Action.CopyToClipboard content={url} title="Copy Block URL" />
        </ActionPanel>
      }
    />
  );
}
