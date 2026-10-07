import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { getUploadStatus, platformName, postUrl, PlatformResult, urls } from "../api";

const FINAL_STATUSES = ["completed", "failed", "not_found"];

function resultAccessory(result: PlatformResult): List.Item.Accessory {
  if (result.skipped) return { tag: { value: "Skipped", color: Color.SecondaryText } };
  if (result.fallback_to_inbox) return { tag: { value: "Sent to TikTok Inbox", color: Color.Yellow } };
  const status = result.status ?? (result.success === true ? "completed" : result.success === false ? "failed" : "");
  switch (status) {
    case "completed":
      return { tag: { value: "Published", color: Color.Green } };
    case "failed":
      return { tag: { value: "Failed", color: Color.Red } };
    case "retryable":
      return { tag: { value: "Retrying", color: Color.Orange } };
    case "processing":
      return { tag: { value: "Processing", color: Color.Blue } };
    default:
      return { tag: { value: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Queued" } };
  }
}

export function UploadStatus(props: { requestId?: string; jobId?: string }) {
  const { requestId, jobId } = props;
  const { data, isLoading, revalidate } = usePromise(getUploadStatus, [{ requestId, jobId }]);

  // Poll every 5 seconds until an immediate upload reaches a final state. Scheduled jobs wait for their date.
  useEffect(() => {
    if (!data || jobId || FINAL_STATUSES.includes(data.status)) return;
    const timer = setTimeout(revalidate, 5000);
    return () => clearTimeout(timer);
  }, [data]);

  const id = requestId ?? jobId ?? "";
  const results = data?.results ?? [];
  const progress = data?.total ? ` · ${data.completed ?? 0}/${data.total}` : "";
  const statusText = data ? `${data.status.replace(/_/g, " ")}${progress}` : "Loading…";

  return (
    <List isLoading={isLoading} navigationTitle="Upload Status" searchBarPlaceholder="Filter platforms">
      <List.EmptyView
        icon={data?.status === "not_found" ? Icon.QuestionMark : Icon.Clock}
        title={data?.status === "not_found" ? "Upload Not Found" : `Status: ${statusText}`}
        description={
          data?.message ??
          (jobId ? "The post is scheduled. Results appear here once it is published." : "Waiting for results…")
        }
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action.CopyToClipboard title="Copy ID" content={id} />
            <Action.OpenInBrowser title="Open Upload History" url={urls.uploadHistory} />
          </ActionPanel>
        }
      />
      <List.Section title={`Status: ${statusText}`} subtitle={id}>
        {results.map((result, index) => {
          const url = postUrl(result);
          return (
            <List.Item
              key={`${result.platform}-${index}`}
              title={platformName(result.platform ?? "unknown")}
              subtitle={result.error ?? result.message}
              accessories={[resultAccessory(result)]}
              actions={
                <ActionPanel>
                  {url && <Action.OpenInBrowser title="Open Post" url={url} />}
                  {url && <Action.CopyToClipboard title="Copy Post URL" content={url} />}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action.CopyToClipboard title="Copy ID" content={id} shortcut={Keyboard.Shortcut.Common.Copy} />
                  <Action.OpenInBrowser title="Open Upload History" url={urls.uploadHistory} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
