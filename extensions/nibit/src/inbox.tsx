import { Action, ActionPanel, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import type { PushItem } from "./lib/secure";
import { getSharedClient } from "./lib/client";
import { ensureSignedIn } from "./lib/oauth";
import { copyPushItem, pastePushItem, signOutAndClearLocalState } from "./lib/actions";
import { runItemAction } from "./lib/item-actions";
import {
  isFileItem,
  isImageItem,
  isUrlItem,
  itemIcon,
  listInbox,
  syncInbox,
  toFileMarkdownUrl,
} from "./lib/push-items";
import { PushDetailView } from "./components/push-detail";
import { subscribeToInboxUpdates } from "./lib/realtime";

function SignedOutState({ onSignedIn }: { onSignedIn: () => void }) {
  return (
    <Detail
      markdown="# Connect Nibit\n\nSign in to your Nibit account to sync encrypted pushes into Raycast."
      actions={
        <ActionPanel>
          <Action
            title="Sign in"
            onAction={async () => {
              const session = await ensureSignedIn();
              if (session) onSignedIn();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function ItemActions({
  item,
  onRefresh,
  onSignOut,
}: {
  item: PushItem;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const pasteTitle = isFileItem(item) ? "Paste File Or Path" : "Paste And Close";
  const copyTitle = isFileItem(item) ? "Copy File Or Path" : "Copy To Clipboard";

  return (
    <ActionPanel>
      <Action.Push title="Open Details" target={<PushDetailView item={item} onRefresh={onRefresh} />} />
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
      {isUrlItem(item) && (
        <Action.OpenInBrowser url={item.content} title="Open URL" shortcut={Keyboard.Shortcut.Common.Open} />
      )}
      <ActionPanel.Section>
        <Action
          title="Refresh Inbox"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => runItemAction("Refresh failed", onRefresh)}
        />
        <Action title="Sign out" icon={Icon.Logout} onAction={() => runItemAction("Sign Out Failed", onSignOut)} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

const INBOX_FALLBACK_POLL_MS = 5 * 60_000;

function InboxItemDetail({ item }: { item: PushItem }) {
  const { data: blob } = useCachedPromise(async () => {
    if (!isImageItem(item)) return null;
    return getSharedClient().getStoredBlob(item.id);
  }, []);

  const markdown =
    isImageItem(item) && blob && typeof blob === "object" && "path" in blob && typeof blob.path === "string"
      ? `![${item.title ?? "Image"}](${toFileMarkdownUrl(blob.path)})\n\n### ${item.title ?? "Image"}\n\nSource: ${
          item.source_device ?? "Unknown"
        }`
      : isFileItem(item)
        ? `# ${item.title ?? "File"}\n\nSource: ${item.source_device ?? "Unknown"}`
        : `# ${item.title ?? "Push"}\n\n\`\`\`\n${item.content}\n\`\`\``;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={item.title ?? item.content} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="From" text={item.source_device ?? "Unknown"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Type" text={item.content_type} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Received" text={new Date(item.created_at).toLocaleString()} />
          {item.expires_at ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Expires" text={new Date(item.expires_at).toLocaleString()} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const loadItems = useCallback(async () => {
    const session = await ensureSignedIn();
    if (!session) return null;
    return listInbox().catch(() => [] as PushItem[]);
  }, []);

  const { data, isLoading, revalidate } = useCachedPromise(loadItems, [], { keepPreviousData: true });

  // Keep a stable ref so the realtime callback doesn't capture a stale revalidate.
  const revalidateRef = useRef(revalidate);
  useEffect(() => {
    revalidateRef.current = revalidate;
  }, [revalidate]);

  // Bumped after the initial sync completes so the realtime effect re-fires
  // once a device ID exists (subscribeToInboxUpdates skips when no device).
  const [resubKey, setResubKey] = useState(0);

  const syncAndRevalidate = useCallback(async () => {
    await syncInbox();
    revalidateRef.current();
  }, []);

  // Realtime subscription: active while the inbox is open and the user is signed in.
  const isSignedIn = data !== null && data !== undefined;
  useEffect(() => {
    if (!isSignedIn) return;
    return subscribeToInboxUpdates((hint) => {
      if (hint?.alreadySynced) {
        revalidateRef.current();
        return;
      }
      void syncAndRevalidate().catch(() => {
        // Realtime-triggered sync failed; the fallback poll below will catch it.
      });
    });
  }, [isSignedIn, resubKey, syncAndRevalidate]);

  // Realtime should be the fast path, but keep a bounded fallback poll while the Inbox
  // is open so missed SSE/DO fanout events do not require a manual refresh.
  useEffect(() => {
    if (!isSignedIn) return;
    let inFlight = false;
    const timer = setInterval(() => {
      if (inFlight) return;
      inFlight = true;
      void syncAndRevalidate()
        .catch(() => {
          // Keep polling; transient auth/network errors are surfaced by explicit refresh/sign-in flows.
        })
        .finally(() => {
          inFlight = false;
        });
    }, INBOX_FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [isSignedIn, syncAndRevalidate]);

  // Sync once on mount after sign-in is confirmed. The realtime subscription
  // handles subsequent updates; the 5-minute fallback poll covers gaps.
  const didSyncRef = useRef(false);
  useEffect(() => {
    // data is undefined while loading, null when signed out — skip both.
    if (data == null || didSyncRef.current) return;
    didSyncRef.current = true;

    void syncInbox()
      .then(() => {
        revalidateRef.current();
        // Re-trigger realtime subscription now that device bootstrap has run.
        setResubKey((k) => k + 1);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        void showToast({
          style: Toast.Style.Failure,
          title: "Sync failed",
          message: msg,
        });
      });
  }, [data]);

  const onSignedIn = useCallback(() => {
    didSyncRef.current = false;
    setResubKey((k) => k + 1);
    revalidate();
  }, [revalidate]);

  const onRefresh = useCallback(async () => {
    await syncInbox();
    revalidate();
  }, [revalidate]);

  const onSignOut = useCallback(async () => {
    await signOutAndClearLocalState();
    didSyncRef.current = false;
    setResubKey((k) => k + 1);
    // Just revalidate to show the signed-out state. Do NOT sync — that calls
    // ensureSignedIn which would immediately re-prompt the OAuth flow.
    revalidate();
  }, [revalidate]);

  if (data === null && !isLoading) {
    return <SignedOutState onSignedIn={onSignedIn} />;
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search recent secure pushes...">
      <List.EmptyView
        icon={Icon.Tray}
        title="No pushes yet"
        description="Send something from your phone or other Nibit devices and it will appear here."
      />
      {(data ?? []).map((item) => (
        <List.Item
          key={item.id}
          icon={itemIcon(item)}
          title={item.title ?? item.content}
          accessories={[{ text: new Date(item.created_at).toLocaleDateString() }]}
          detail={<InboxItemDetail item={item} />}
          actions={<ItemActions item={item} onRefresh={onRefresh} onSignOut={onSignOut} />}
        />
      ))}
    </List>
  );
}
