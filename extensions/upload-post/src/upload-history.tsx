import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getUploadHistory, HistoryItem, parseApiDate, platformName, postUrl, urls } from "./api";
import { UploadStatus } from "./components/upload-status";

type Filter = "all" | "success" | "failed";

const PAGE_SIZE = 50;

export default function Command() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (status: Filter) => async (options: { page: number }) => {
      const response = await getUploadHistory({
        page: options.page + 1,
        limit: PAGE_SIZE,
        status: status === "all" ? undefined : status,
      });
      const items = response.history;
      // A full page means there may be more; `total` (when present) lets us stop exactly on the last page.
      const fullPage = items.length === PAGE_SIZE;
      const hasMore =
        typeof response.total === "number" ? fullPage && (options.page + 1) * PAGE_SIZE < response.total : fullPage;
      return { data: items, hasMore };
    },
    [filter],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Could not load upload history" });
      },
    },
  );

  const items = data ?? [];

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search uploads"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Result" onChange={(v) => setFilter(v as Filter)} storeValue>
          <List.Dropdown.Item title="All Uploads" value="all" />
          <List.Dropdown.Item title="Published" value="success" />
          <List.Dropdown.Item title="Failed" value="failed" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Clock}
        title="No Uploads Yet"
        description="Posts you publish with Upload-Post show up here."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Upload History" url={urls.uploadHistory} />
          </ActionPanel>
        }
      />
      {items.map((item, index) => {
        const url = postUrl(item);
        return (
          <List.Item
            key={`${item.request_id ?? item.job_id ?? ""}-${item.platform}-${item.upload_timestamp}-${index}`}
            icon={statusIcon(item)}
            title={itemTitle(item)}
            subtitle={platformName(item.platform)}
            keywords={[item.platform, item.profile_username ?? "", item.error_message ?? ""]}
            accessories={[
              ...(item.profile_username ? [{ tag: item.profile_username, icon: Icon.Person }] : []),
              ...(item.upload_timestamp ? [{ date: parseApiDate(item.upload_timestamp) }] : []),
            ]}
            actions={
              <ActionPanel>
                {url && <Action.OpenInBrowser title="Open Post" url={url} />}
                {url && <Action.CopyToClipboard title="Copy Post URL" content={url} />}
                {!item.success && item.error_message && (
                  <Action.CopyToClipboard title="Copy Error" content={item.error_message} />
                )}
                {(item.request_id || item.job_id) && (
                  <Action.Push
                    title="Show Upload Status"
                    icon={Icon.Info}
                    target={
                      <UploadStatus
                        requestId={item.request_id ?? undefined}
                        jobId={item.request_id ? undefined : (item.job_id ?? undefined)}
                      />
                    }
                  />
                )}
                <Action.OpenInBrowser title="Open in Upload-Post" url={urls.uploadHistory} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function itemTitle(item: HistoryItem): string {
  const text = item.post_title?.trim() || item.post_caption?.trim();
  if (text) return text.length > 80 ? `${text.slice(0, 79)}…` : text;
  return item.media_type ? `${item.media_type.charAt(0).toUpperCase()}${item.media_type.slice(1)} post` : "Post";
}

function statusIcon(item: HistoryItem): List.Item.Props["icon"] {
  if (item.fallback_to_inbox) return { source: Icon.Tray, tintColor: Color.Yellow, tooltip: "Sent to TikTok inbox" };
  if (item.success) return { source: Icon.CheckCircle, tintColor: Color.Green, tooltip: "Published" };
  return {
    source: Icon.XMarkCircle,
    tintColor: Color.Red,
    tooltip: item.error_message ? `Failed: ${item.error_message}` : "Failed",
  };
}
