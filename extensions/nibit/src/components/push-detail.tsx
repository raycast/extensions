import { Action, ActionPanel, Detail, Icon, Keyboard, open, popToRoot, showInFinder } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { PushItem } from "../lib/secure";
import { getSharedClient } from "../lib/client";
import { copyPushItem, pastePushItem, signOutAndClearLocalState } from "../lib/actions";
import { runItemAction } from "../lib/item-actions";
import { isFileItem, isImageItem, isUrlItem, toFileMarkdownUrl } from "../lib/push-items";

function itemMarkdown(item: PushItem, filePath?: string | null): string {
  if (isImageItem(item) && filePath) {
    return `![${item.title ?? "Image"}](${toFileMarkdownUrl(filePath)})\n\n## ${item.title ?? "Image"}`;
  }

  if (isFileItem(item)) {
    return `# ${item.title ?? "File"}\n\nA secure file from ${item.source_device ?? "Unknown device"}.`;
  }

  if (isUrlItem(item)) {
    return `# ${item.title ?? "URL"}\n\n${item.content}`;
  }

  return `# ${item.title ?? "Push"}\n\n\`\`\`\n${item.content}\n\`\`\``;
}

export function PushDetailView({ item, onRefresh }: { item: PushItem; onRefresh?: () => Promise<void> }) {
  const pasteTitle = isFileItem(item) ? "Paste File or Path" : "Paste and Close";
  const copyTitle = isFileItem(item) ? "Copy File or Path" : "Copy to Clipboard";
  const { data: blob } = useCachedPromise(async () => {
    if (!isImageItem(item)) return null;
    return getSharedClient().getStoredBlob(item.id);
  }, []);

  return (
    <Detail
      markdown={itemMarkdown(
        item,
        blob && typeof blob === "object" && "path" in blob && typeof blob.path === "string" ? blob.path : null,
      )}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={item.source_device ?? "Unknown"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Type" text={item.content_type} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Received" text={new Date(item.created_at).toLocaleString()} />
          {item.expires_at ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Expires" text={new Date(item.expires_at).toLocaleString()} />
            </>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isUrlItem(item) ? (
            <Action.OpenInBrowser url={item.content} title="Open URL" shortcut={Keyboard.Shortcut.Common.Open} />
          ) : null}
          <Action
            title={pasteTitle}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={() => runItemAction("Paste failed", () => pastePushItem(item))}
          />
          <Action
            title={copyTitle}
            icon={Icon.CopyClipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => runItemAction("Copy failed", () => copyPushItem(item))}
          />
          {isFileItem(item) ? (
            <Action
              title="Open File"
              icon={Icon.AppWindow}
              onAction={() =>
                runItemAction("Open failed", async () => {
                  const blob = await getSharedClient().getStoredBlob(item.id);
                  if (!blob?.path) throw new Error("File is unavailable.");
                  await open(blob.path);
                })
              }
            />
          ) : null}
          {isFileItem(item) ? (
            <Action
              title="Reveal in Finder"
              icon={Icon.Finder}
              onAction={() =>
                runItemAction("Reveal failed", async () => {
                  const blob = await getSharedClient().getStoredBlob(item.id);
                  if (!blob?.path) throw new Error("File is unavailable.");
                  await showInFinder(blob.path);
                })
              }
            />
          ) : null}
          {onRefresh ? (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => runItemAction("Refresh failed", onRefresh)}
            />
          ) : null}
          <Action
            title="Sign out"
            icon={Icon.Logout}
            onAction={() =>
              runItemAction("Sign Out Failed", async () => {
                await signOutAndClearLocalState();
                await popToRoot();
              })
            }
          />
          <Action
            title="Delete Local Item"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() =>
              runItemAction("Delete failed", async () => {
                await getSharedClient().deleteSecurePushItem(item.id);
                if (onRefresh) await onRefresh();
              })
            }
          />
        </ActionPanel>
      }
    />
  );
}
