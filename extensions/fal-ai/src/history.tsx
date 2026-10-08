import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { mkdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";
import {
  browseAssets,
  cancelGeneration,
  getQueueResult,
  getQueueStatus,
} from "./api";
import { extractMediaUrls, inferMediaType, mediaTitle } from "./media";
import {
  clearHistory,
  deleteRecord,
  getHistory,
  saveHistory,
  upsertRecord,
} from "./storage";
import { FalAsset, GenerationRecord, QueueStatus } from "./types";

type ViewMode = "requests" | "assets";

export default function HistoryCommand() {
  const [mode, setMode] = useState<ViewMode>("requests");
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [assets, setAssets] = useState<FalAsset[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function reload() {
    setIsLoading(true);
    setError(undefined);
    try {
      if (mode === "requests") {
        setRecords(await getHistory());
      } else {
        setAssets(await browseAssets(searchText));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      if (mode === "assets") setAssets([]);
      await showToast({
        style: Toast.Style.Failure,
        title:
          mode === "assets"
            ? "Could not load fal Assets"
            : "Could not load history",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(reload, mode === "assets" ? 250 : 0);
    return () => clearTimeout(timeout);
  }, [mode, searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={
        mode === "assets"
          ? "Search fal Assets..."
          : "Search generation history..."
      }
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Source"
          value={mode}
          onChange={(value) => setMode(value as ViewMode)}
        >
          <List.Dropdown.Item title="Requests" value="requests" />
          <List.Dropdown.Item title="fal Assets" value="assets" />
        </List.Dropdown>
      }
    >
      {mode === "requests" ? (
        <RequestSection
          records={filterRecords(records, searchText)}
          onReload={reload}
        />
      ) : (
        <AssetSection assets={assets} error={error} />
      )}
    </List>
  );
}

function RequestSection({
  records,
  onReload,
}: {
  records: GenerationRecord[];
  onReload: () => Promise<void>;
}) {
  if (!records.length) {
    return (
      <List.EmptyView
        icon={Icon.Clock}
        title="No generation requests yet"
        description="Submit one from Create."
      />
    );
  }

  return (
    <List.Section title="Generation Requests">
      {records.map((record) => (
        <RequestItem key={record.id} record={record} onReload={onReload} />
      ))}
    </List.Section>
  );
}

function RequestItem({
  record,
  onReload,
}: {
  record: GenerationRecord;
  onReload: () => Promise<void>;
}) {
  const mediaUrl = record.mediaUrls[0];

  return (
    <List.Item
      icon={mediaUrl ? mediaIcon(mediaUrl) : statusIcon(record.status)}
      title={record.prompt || record.title}
      subtitle={record.endpointId}
      accessories={[
        { text: statusText(record), icon: statusAccessory(record.status) },
        { date: new Date(record.createdAt) },
      ]}
      detail={
        <List.Item.Detail
          markdown={requestMarkdown(record)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={statusText(record)}
                icon={statusAccessory(record.status)}
              />
              <List.Item.Detail.Metadata.Label
                title="Endpoint"
                text={record.endpointId}
              />
              <List.Item.Detail.Metadata.Label
                title="Request ID"
                text={record.id}
              />
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={new Date(record.createdAt).toLocaleString()}
              />
              {mediaUrl ? (
                <List.Item.Detail.Metadata.Link
                  title="Asset"
                  target={mediaUrl}
                  text={mediaTitle(mediaUrl)}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<RequestActions record={record} onReload={onReload} />}
    />
  );
}

function RequestActions({
  record,
  onReload,
}: {
  record: GenerationRecord;
  onReload: () => Promise<void>;
}) {
  const mediaUrl = record.mediaUrls[0];

  return (
    <ActionPanel>
      <Action
        title="Refresh Status"
        icon={Icon.ArrowClockwise}
        onAction={() => refreshRecord(record, onReload)}
      />
      {mediaUrl ? (
        <Action.OpenInBrowser title="Open Asset" url={mediaUrl} />
      ) : null}
      {mediaUrl ? (
        <Action.CopyToClipboard title="Copy Asset URL" content={mediaUrl} />
      ) : null}
      {mediaUrl ? (
        <Action
          title="Download Asset"
          icon={Icon.Download}
          onAction={() => downloadAsset(mediaUrl)}
        />
      ) : null}
      <Action.CopyToClipboard title="Copy Request ID" content={record.id} />
      <Action.CopyToClipboard
        title="Copy Result JSON"
        content={JSON.stringify(record.result ?? record.input, null, 2)}
      />
      <Action
        title="Copy as Markdown"
        icon={Icon.Clipboard}
        onAction={() => Clipboard.copy(requestMarkdown(record))}
      />
      {record.status !== "COMPLETED" ? (
        <Action
          title="Cancel Request"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={() => cancelRecord(record, onReload)}
        />
      ) : null}
      <Action
        title="Delete from History"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => removeRecord(record.id, onReload)}
      />
      <Action
        title="Clear History"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => clearAll(onReload)}
      />
    </ActionPanel>
  );
}

function AssetSection({
  assets,
  error,
}: {
  assets: FalAsset[];
  error?: string;
}) {
  if (error) {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="Could not load fal Assets"
        description={error}
      />
    );
  }

  if (!assets.length)
    return <List.EmptyView icon={Icon.Image} title="No assets found" />;

  return (
    <List.Section title="fal Assets">
      {assets.map((asset) => (
        <AssetItem key={asset.vector_id ?? asset.url} asset={asset} />
      ))}
    </List.Section>
  );
}

function AssetItem({ asset }: { asset: FalAsset }) {
  const assetUrl = asset.url;
  const title =
    asset.title ||
    asset.prompt ||
    (assetUrl ? mediaTitle(assetUrl) : undefined) ||
    "Untitled asset";

  return (
    <List.Item
      icon={assetUrl ? mediaIcon(assetUrl) : Icon.Image}
      title={title}
      subtitle={asset.endpoint}
      accessories={[
        { text: asset.type },
        asset.created_at ? { date: new Date(asset.created_at) } : {},
      ]}
      detail={
        <List.Item.Detail
          markdown={assetMarkdown(asset)}
          metadata={
            <List.Item.Detail.Metadata>
              {asset.type ? (
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={asset.type}
                />
              ) : null}
              {asset.endpoint ? (
                <List.Item.Detail.Metadata.Label
                  title="Endpoint"
                  text={asset.endpoint}
                />
              ) : null}
              {asset.request_id ? (
                <List.Item.Detail.Metadata.Label
                  title="Request ID"
                  text={asset.request_id}
                />
              ) : null}
              {asset.created_at ? (
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={new Date(asset.created_at).toLocaleString()}
                />
              ) : null}
              {assetUrl ? (
                <List.Item.Detail.Metadata.Link
                  title="Asset"
                  target={assetUrl}
                  text={mediaTitle(assetUrl)}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {assetUrl ? (
            <Action.OpenInBrowser title="Open Asset" url={assetUrl} />
          ) : null}
          {assetUrl ? (
            <Action.CopyToClipboard title="Copy Asset URL" content={assetUrl} />
          ) : null}
          {assetUrl ? (
            <Action
              title="Download Asset"
              icon={Icon.Download}
              onAction={() => downloadAsset(assetUrl)}
            />
          ) : null}
          {asset.request_id ? (
            <Action.CopyToClipboard
              title="Copy Request ID"
              content={asset.request_id}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

async function refreshRecord(
  record: GenerationRecord,
  onReload: () => Promise<void>,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing status...",
  });

  try {
    const status = await getQueueStatus(record);
    let result = record.result;
    let mediaUrls = record.mediaUrls;
    let nextStatus: QueueStatus = status.status;

    if (status.status === "COMPLETED" && !status.error) {
      result = await getQueueResult({
        ...record,
        responseUrl: status.response_url ?? record.responseUrl,
      });
      mediaUrls = extractGeneratedMediaUrls(result, record);
    }

    if (status.error) nextStatus = "FAILED";

    await upsertRecord({
      ...record,
      status: nextStatus,
      queuePosition: status.queue_position,
      responseUrl: status.response_url ?? record.responseUrl,
      result,
      mediaUrls,
      error: status.error,
      updatedAt: new Date().toISOString(),
    });

    toast.style = Toast.Style.Success;
    toast.title =
      nextStatus === "COMPLETED" ? "Generation complete" : "Status refreshed";
    await onReload();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ALREADY_COMPLETED")) {
      await markRecordComplete(record);
      toast.style = Toast.Style.Success;
      toast.title = "Request already completed";
      await onReload();
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = "Refresh failed";
    toast.message = message;
  }
}

async function cancelRecord(
  record: GenerationRecord,
  onReload: () => Promise<void>,
) {
  if (
    !(await confirmAlert({
      title: "Cancel this request?",
      message: record.id,
      primaryAction: { title: "Cancel", style: Alert.ActionStyle.Destructive },
    }))
  ) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Cancelling request...",
  });

  try {
    await cancelGeneration(record);
    await markRecordFailed(record.id, "Cancelled");
    toast.style = Toast.Style.Success;
    toast.title = "Request cancelled";
    await onReload();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ALREADY_COMPLETED")) {
      await markRecordComplete(record);
      toast.style = Toast.Style.Success;
      toast.title = "Request already completed";
      await onReload();
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = "Cancel failed";
    toast.message = message;
  }
}

async function removeRecord(id: string, onReload: () => Promise<void>) {
  if (
    !(await confirmAlert({
      title: "Delete from history?",
      message: "This only removes the local Raycast history entry.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    }))
  ) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Deleting history entry...",
  });

  try {
    await deleteRecord(id);
    toast.style = Toast.Style.Success;
    toast.title = "Deleted from history";
    await onReload();
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Delete failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

async function clearAll(onReload: () => Promise<void>) {
  if (
    await confirmAlert({
      title: "Clear generation history?",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    })
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing history...",
    });
    try {
      await clearHistory();
      toast.style = Toast.Style.Success;
      toast.title = "History cleared";
      await onReload();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Clear failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }
}

async function markRecordFailed(id: string, error: string) {
  await saveHistory(
    (await getHistory()).map((entry) =>
      entry.id === id
        ? {
            ...entry,
            status: "FAILED",
            error,
            updatedAt: new Date().toISOString(),
          }
        : entry,
    ),
  );
}

async function markRecordComplete(record: GenerationRecord) {
  let result = record.result;
  let mediaUrls = record.mediaUrls;

  try {
    result = await getQueueResult(record);
    mediaUrls = extractGeneratedMediaUrls(result, record);
  } catch {
    // The request is complete; preserving the existing record is better than failing the cancel action.
  }

  await upsertRecord({
    ...record,
    status: "COMPLETED",
    result,
    mediaUrls,
    error: undefined,
    updatedAt: new Date().toISOString(),
  });
}

function extractGeneratedMediaUrls(result: unknown, record: GenerationRecord) {
  const inputUrls = new Set(extractMediaUrls(record.input));
  return extractMediaUrls(result).filter((url) => !inputUrls.has(url));
}

async function downloadAsset(url: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading asset...",
  });

  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    const downloadsPath = join(homedir(), "Downloads");
    await mkdir(downloadsPath, { recursive: true });

    const filePath = join(
      downloadsPath,
      uniqueDownloadFilename(mediaTitle(url)),
    );
    await writeFile(filePath, bytes);

    toast.style = Toast.Style.Success;
    toast.title = "Asset downloaded";
    toast.message = filePath;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

function requestMarkdown(record: GenerationRecord) {
  const urls = record.mediaUrls;
  const firstImage = urls.find((url) => inferMediaType(url) === "image");
  const linkedUrls = urls.length
    ? urls.map((url) => `- [${mediaTitle(url)}](${url})`).join("\n")
    : "No generated asset URL yet. Refresh the request when it completes.";

  return [
    `# ${record.prompt || record.title}`,
    "",
    firstImage ? `![Generated asset](${firstImage})` : undefined,
    firstImage ? "" : undefined,
    `**Status:** ${statusText(record)}  `,
    `**Endpoint:** \`${record.endpointId}\`  `,
    `**Request:** \`${record.id}\``,
    "",
    "## Assets",
    linkedUrls,
    "",
    "## Input",
    "```json",
    JSON.stringify(record.input, null, 2),
    "```",
    record.result ? "## Result" : undefined,
    record.result ? "```json" : undefined,
    record.result ? JSON.stringify(record.result, null, 2) : undefined,
    record.result ? "```" : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function assetMarkdown(asset: FalAsset) {
  const assetUrl = asset.url;
  const title =
    asset.title ||
    asset.prompt ||
    (assetUrl ? mediaTitle(assetUrl) : undefined) ||
    "fal Asset";
  const isImage = assetUrl && inferMediaType(assetUrl) === "image";

  return [
    `# ${title}`,
    "",
    isImage ? `![Asset preview](${assetUrl})` : undefined,
    isImage ? "" : undefined,
    assetUrl ? `[Open asset](${assetUrl})` : "No asset URL available.",
    asset.prompt ? "" : undefined,
    asset.prompt ? "## Prompt" : undefined,
    asset.prompt,
  ]
    .filter(Boolean)
    .join("\n");
}

function filterRecords(records: GenerationRecord[], searchText: string) {
  const query = searchText.trim().toLowerCase();
  if (!query) return records;
  return records.filter((record) =>
    `${record.prompt} ${record.title} ${record.endpointId} ${record.id}`
      .toLowerCase()
      .includes(query),
  );
}

function statusText(record: GenerationRecord) {
  if (record.error) return record.error;
  if (record.status === "COMPLETED") return "completed";
  if (record.status === "IN_PROGRESS") return "running";
  if (record.status === "IN_QUEUE" && record.queuePosition !== undefined)
    return `queued #${record.queuePosition}`;
  return record.status.replace(/_/g, " ").toLowerCase();
}

function statusIcon(status: string) {
  if (status === "COMPLETED") return Icon.CheckCircle;
  if (status === "FAILED") return Icon.XMarkCircle;
  if (status === "IN_PROGRESS") return Icon.Gear;
  return Icon.Clock;
}

function statusAccessory(status: string) {
  if (status === "COMPLETED")
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (status === "FAILED")
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (status === "IN_PROGRESS")
    return { source: Icon.Gear, tintColor: Color.Blue };
  return { source: Icon.Clock, tintColor: Color.SecondaryText };
}

function mediaIcon(url: string) {
  const type = inferMediaType(url);
  if (type === "image") return { source: url };
  if (type === "video") return Icon.Video;
  if (type === "audio") return Icon.SpeakerOn;
  if (type === "3d") return Icon.Box;
  return Icon.Document;
}

function uniqueDownloadFilename(name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safe = safeFilename(name);
  const dotIndex = safe.lastIndexOf(".");
  if (dotIndex > 0) {
    return `${safe.slice(0, dotIndex)}-${timestamp}${safe.slice(dotIndex)}`;
  }
  return `${safe}-${timestamp}`;
}

function safeFilename(name: string) {
  const fallback = `fal-asset-${Date.now()}`;
  return (name || fallback).replace(/[/:*?"<>|]/g, "-");
}
