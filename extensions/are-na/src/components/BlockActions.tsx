import { ActionPanel, Action, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { Block, MinimalChannel } from "../api/types";
import { TextBlockView } from "./text";
import { ImageBlockView } from "./image";
import { ChannelView } from "./channel";
import { CreateBlockView } from "./createBlock";
import { useMemo } from "react";
import { downloadFile } from "../utils/download";
import { useArena } from "../hooks/useArena";
import { EditBlockView } from "./editBlock";
import { ConnectBlockView } from "./connectBlock";
import type { ReactNode } from "react";
import { isHttpUrl } from "../utils/url";

interface BlockActionsProps {
  block?: Block;
  channel?: MinimalChannel;
  extraActions?: ReactNode;
}

export function BlockActions({ block, channel, extraActions }: BlockActionsProps) {
  const arena = useArena();
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
                  user: block.user.full_name,
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
              icon={Icon.Download}
              onAction={() => {
                try {
                  const candidates = [block.image?.original?.url, block.image?.display?.url, block.image?.thumb?.url];
                  const fileUrl = candidates.find(isHttpUrl);
                  if (fileUrl) downloadFile(fileUrl);
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
      case "Link":
      case "Media":
        return url ? <Action.OpenInBrowser url={url} icon={Icon.Globe} title="Open in Browser" /> : null;
      case "PendingBlock":
        return url ? <Action.OpenInBrowser url={url} icon={Icon.Clock} title="Open Block (Processing)" /> : null;
      default:
        return url ? <Action.OpenInBrowser url={url} icon={Icon.Globe} title="Open in Browser" /> : null;
    }
  };

  return (
    <ActionPanel title={block?.title ?? "✦"}>
      {renderBlockAction()}
      {block ? (
        <ActionPanel.Section>
          <Action.Push
            icon={Icon.Pencil}
            title="Edit Block"
            target={<EditBlockView block={block} channel={channel} />}
          />
          <Action.Push
            icon={Icon.Link}
            title="Connect Block to Channels"
            target={<ConnectBlockView block={block} channel={channel} />}
          />
          {channel && block.connection?.id ? (
            <Action
              icon={Icon.XMarkCircle}
              title="Remove from This Channel"
              style={Action.Style.Destructive}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Remove connection?",
                  message: "This only removes the block from the current channel.",
                  primaryAction: {
                    title: "Remove",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!confirmed) {
                  return;
                }
                try {
                  const connectionId = block.connection?.id;
                  if (!connectionId) {
                    return;
                  }
                  await arena.connection(connectionId).delete();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Removed from channel",
                    message: block.title ?? `Block ${block.id}`,
                  });
                } catch (error) {
                  showFailureToast(error, { title: "Failed to remove connection" });
                }
              }}
            />
          ) : null}
          <Action
            icon={Icon.Trash}
            title="Delete Block"
            style={Action.Style.Destructive}
            onAction={async () => {
              if (!block?.id) {
                return;
              }
              const confirmed = await confirmAlert({
                title: "Delete block?",
                message: "This permanently deletes the block.",
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!confirmed) {
                return;
              }
              try {
                await arena.block(block.id).delete();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Block deleted",
                  message: block.title ?? `Block ${block.id}`,
                });
              } catch (error) {
                showFailureToast(error, { title: "Failed to delete block" });
              }
            }}
          />
        </ActionPanel.Section>
      ) : null}
      {extraActions}
      <ActionPanel.Section>
        {url && (
          <>
            <Action.CopyToClipboard
              icon={Icon.Link}
              title="Copy Link"
              content={url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title="Open in Browser"
              url={url}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </>
        )}
        {channel && (
          <Action.Push icon={Icon.Plus} title="Add New Block" target={<CreateBlockView channel={channel} />} />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
