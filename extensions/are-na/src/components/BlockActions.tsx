import { ActionPanel, Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { Block, MinimalChannel } from "../api/types";
import { TextBlockView } from "./text";
import { ImageBlockView } from "./image";
import { ChannelView } from "./channel";
import { CreateBlockView } from "./createBlock";
import { useMemo } from "react";
import { downloadFile } from "../utils/download";

interface BlockActionsProps {
  block?: Block;
  channel?: MinimalChannel;
}

export function BlockActions({ block, channel }: BlockActionsProps) {
  const url = useMemo(() => {
    return block?.source?.url || (block?.id ? `https://www.are.na/block/${block?.id}` : undefined);
  }, [block?.source, block?.id]);

  const renderBlockAction = () => {
    if (!block) return null;

    switch (block.class) {
      case "Channel":
        return (
          <Action.Push
            icon={{ source: "extension-icon.png" }}
            title="Enter Channel"
            target={
              <ChannelView
                channel={{
                  slug: block.slug || "",
                  title: block.title || "",
                  user: block.user || "",
                  open: channel?.open,
                }}
              />
            }
          />
        );
      case "Text":
        return <Action.Push icon={Icon.Paragraph} title="View Text" target={<TextBlockView block={block} />} />;
      case "Image":
        return (
          <>
            <Action.Push icon={Icon.Image} title="View Image" target={<ImageBlockView block={block} />} />
            <Action
              title="Download Image"
              onAction={() => {
                try {
                  if (block.source?.url) {
                    downloadFile(block.source.url);
                  }
                } catch (error) {
                  showFailureToast(error, { title: "Failed to download image" });
                }
              }}
            />
          </>
        );
      case "Attachment":
        return (
          <Action
            title="Download Attachment"
            icon={Icon.Download}
            onAction={() => {
              try {
                if (block.attachment?.url) {
                  downloadFile(block.attachment.url);
                }
              } catch (error) {
                showFailureToast(error, { title: "Failed to download attachment" });
              }
            }}
          />
        );
      default:
        return url ? <Action.OpenInBrowser url={url} /> : null;
    }
  };

  return (
    <ActionPanel title={block?.title ?? "✦"}>
      {renderBlockAction()}
      <ActionPanel.Section>
        {url && (
          <>
            <Action.CopyToClipboard title="Copy Link" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action.OpenInBrowser title="Open in Browser" url={url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </>
        )}
        {channel && (
          <Action.Push icon={Icon.Plus} title="Add New Block" target={<CreateBlockView channel={channel} />} />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
