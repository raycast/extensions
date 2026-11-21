import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { LoadError } from "./components/load-error";
import { client } from "./lib/client";
import { errorMessage, networkName, NETWORKS } from "./lib/reelspan";

type Row = {
  platform: string;
  success: boolean;
  post_url?: string;
  error_message?: string | null;
  post_title?: string | null;
  post_caption?: string | null;
  request_id?: string;
  profile_username?: string;
  upload_timestamp?: string;
};

export default function Command() {
  const [platform, setPlatform] = useState("");
  const { data, isLoading, error, revalidate, pagination } = usePromise(
    (p: string) => async (options: { page: number }) => {
      const r = await client().posts.history({ platform: p || undefined, limit: 50, page: options.page + 1 });
      return { data: r.history as Row[], hasMore: (options.page + 1) * r.limit < r.total };
    },
    [platform],
    { failureToastOptions: { title: "Could not load history" } },
  );

  async function retry(row: Row) {
    if (!row.request_id) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Retrying ${networkName(row.platform)}…` });
    try {
      await client().posts.retry(row.request_id, { platforms: [row.platform] });
      toast.style = Toast.Style.Success;
      toast.title = "Sent again";
      revalidate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Retry failed";
      toast.message = errorMessage(e);
    }
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter posts"
      searchBarAccessory={
        <List.Dropdown tooltip="Network" onChange={setPlatform}>
          <List.Dropdown.Item value="" title="All Networks" />
          {NETWORKS.map((n) => (
            <List.Dropdown.Item key={n.id} value={n.id} title={n.name} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <LoadError title="Could not load history" error={error} onRetry={revalidate} />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Clock}
            title="No posts yet"
            description="Posts you publish with Reelspan show up here."
          />
          {(data ?? []).map((row, i) => (
            <List.Item
              key={`${row.request_id}-${row.platform}-${i}`}
              icon={
                row.success
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.XMarkCircle, tintColor: Color.Red }
              }
              title={row.post_caption || row.post_title || "(no caption)"}
              subtitle={networkName(row.platform)}
              accessories={[
                { text: row.profile_username },
                ...(row.upload_timestamp ? [{ date: new Date(row.upload_timestamp) }] : []),
              ]}
              actions={
                <ActionPanel>
                  {row.post_url && <Action.OpenInBrowser url={row.post_url} />}
                  {!row.success && row.request_id && (
                    <Action title="Retry This Network" icon={Icon.ArrowClockwise} onAction={() => retry(row)} />
                  )}
                  {row.post_url && <Action.CopyToClipboard title="Copy Link" content={row.post_url} />}
                  {row.request_id && <Action.CopyToClipboard title="Copy Request ID" content={row.request_id} />}
                  {row.error_message && <Action.CopyToClipboard title="Copy Error" content={row.error_message} />}
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
