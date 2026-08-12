import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { downloadFile } from "../utils/download";
import type { Block } from "../api/types";
import { useMemo } from "react";
import { isHttpUrl } from "../utils/url";

interface ImageBlockViewProps {
  block: Block;
}

export function ImageBlockView({ block }: ImageBlockViewProps) {
  const blockPageUrl = useMemo(() => `https://www.are.na/block/${block.id}`, [block.id]);
  const sourceUrl = useMemo(() => {
    const u = block.source?.url;
    return isHttpUrl(u) ? u.trim() : "";
  }, [block.source]);

  const cdnUrl = useMemo(() => {
    const raw = block.image?.original?.url || block.image?.display?.url || block.image?.thumb?.url || "";
    return isHttpUrl(raw) ? raw : "";
  }, [block.image]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString();
  };

  // Link wraps image so Enter / in-view clicks open the block page, not the CDN asset URL
  const imageMarkdown = useMemo(() => {
    if (!cdnUrl) return "Image not available";
    const alt = block.title || "Image";
    return `[![${alt}](${cdnUrl})](${blockPageUrl})`;
  }, [cdnUrl, block.title, blockPageUrl]);

  return (
    <Detail
      markdown={imageMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={block.title || "Untitled"} />
          <Detail.Metadata.Label title="User" text={block.user?.full_name || "Unknown"} />
          <Detail.Metadata.Label title="Created At" text={formatDate(block.created_at)} />
          {block.description && <Detail.Metadata.Label title="Description" text={block.description} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Globe}
            url={blockPageUrl}
            title="Open on Are.na"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            icon={Icon.Link}
            content={blockPageUrl}
            title="Copy Block URL"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {sourceUrl && sourceUrl !== blockPageUrl ? (
            <Action.OpenInBrowser icon={Icon.Link} url={sourceUrl} title="Open Source URL" />
          ) : null}
          {cdnUrl ? (
            <Action.CopyToClipboard icon={Icon.Clipboard} content={cdnUrl} title="Copy Image File URL" />
          ) : null}
          {cdnUrl ? <Action.OpenInBrowser icon={Icon.Image} url={cdnUrl} title="Open Image File (Cdn)" /> : null}
          {cdnUrl ? (
            <Action
              title="Download Image"
              icon={Icon.Download}
              onAction={async () => {
                try {
                  await downloadFile(cdnUrl);
                } catch (error) {
                  showFailureToast(error, { title: "Failed to download image" });
                }
              }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
