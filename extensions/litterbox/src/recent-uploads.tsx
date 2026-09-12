import { useEffect } from "react";
import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  clearRecentUploads,
  getNonExpiredUploads,
  getExpiresAt,
  removeRecentUpload,
  type StoredUpload,
} from "./lib/storage";

function formatExpiry(upload: StoredUpload): string {
  const expiresAt = getExpiresAt(upload);
  const now = Date.now();
  const ms = expiresAt.getTime() - now;
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  if (hours >= 1) return `Expires in ${hours}h`;
  return `Expires in ${mins}m`;
}

const REFRESH_INTERVAL_MS = 60_000; // revalidate every minute so expired items disappear

export default function RecentUploads() {
  const {
    data: uploads,
    isLoading,
    revalidate,
  } = useCachedPromise(getNonExpiredUploads, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    const id = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [revalidate]);

  const handleRemove = async (upload: StoredUpload) => {
    await removeRecentUpload(upload);
    await revalidate();
    showToast(Toast.Style.Success, "Removed from recent uploads");
  };

  const handleClearAll = async () => {
    await clearRecentUploads();
    await revalidate();
    showToast(Toast.Style.Success, "Recent uploads cleared");
  };

  return (
    <List isLoading={isLoading}>
      {!isLoading && (!uploads || uploads.length === 0) && (
        <List.EmptyView
          title="No recent uploads"
          description="Uploads appear here until they expire (1h–72h). Use “Upload to Litterbox” to add one."
        />
      )}
      {uploads?.map((upload: StoredUpload) => (
        <List.Item
          key={`${upload.uploadedAt}-${upload.url}`}
          title={upload.filename}
          icon={Icon.Document}
          accessories={[{ text: formatExpiry(upload) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy URL"
                content={upload.url}
                onCopy={() => showToast(Toast.Style.Success, "URL copied to clipboard")}
              />
              <Action.OpenInBrowser title="Open in Browser" url={upload.url} />
              <Action icon={Icon.Trash} title="Remove from List" onAction={() => handleRemove(upload)} />
              <Action
                icon={Icon.ArrowClockwise}
                title="Refresh"
                onAction={revalidate}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
              {uploads && uploads.length > 0 && (
                <Action icon={Icon.Trash} title="Clear All Recent Uploads" onAction={handleClearAll} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
