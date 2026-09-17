import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Alert, confirmAlert, List, showToast, Toast } from "@raycast/api";
import { deleteUpload, fetchImageDimensions } from "./lib/cdnClient";
import { getUploads, removeUpload, updateUpload } from "./lib/uploadHistory";
import { getApiToken } from "./lib/preferences";
import { useApiToken } from "./hooks/useApiToken";
import { CdnApiError, type UploadRecord } from "./lib/types";
import SetupRequired from "./components/SetupRequired";

const MAX_PREVIEW_DIMENSION = 300;

function buildImageMarkdown(record: UploadRecord): string {
  if (!record.width || !record.height) {
    return `![${record.filename}](${record.url})`;
  }
  const scale = Math.min(1, MAX_PREVIEW_DIMENSION / record.width, MAX_PREVIEW_DIMENSION / record.height);
  const displayWidth = Math.round(record.width * scale);
  const displayHeight = Math.round(record.height * scale);
  return `![${record.filename}](${record.url}?raycast-width=${displayWidth}&raycast-height=${displayHeight})`;
}

export default function Command() {
  const token = useApiToken();
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const attemptedIdsRef = useRef<Set<string>>(new Set());
  const [measuringIds, setMeasuringIds] = useState<Set<string>>(new Set());

  async function refresh() {
    setIsLoading(true);
    setUploads(await getUploads());
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const recordsNeedingDimensions = uploads.filter(
      (record) =>
        record.contentType.startsWith("image/") &&
        (!record.width || !record.height) &&
        !attemptedIdsRef.current.has(record.id),
    );

    recordsNeedingDimensions.forEach((record) => {
      attemptedIdsRef.current.add(record.id);
      setMeasuringIds((current) => new Set(current).add(record.id));

      (async () => {
        const dimensions = await fetchImageDimensions(record.url);
        if (dimensions) {
          const updated = await updateUpload(record.id, dimensions);
          setUploads(updated);
        }
        setMeasuringIds((current) => {
          const next = new Set(current);
          next.delete(record.id);
          return next;
        });
      })();
    });
  }, [uploads]);

  async function handleDeleteFromCdn(record: UploadRecord) {
    const confirmed = await confirmAlert({
      title: `Delete "${record.filename}" from the CDN?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteUpload(record.id, getApiToken());
      await removeUpload(record.id);
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: error instanceof CdnApiError ? error.message : "Failed to delete from CDN",
      });
    }
  }

  async function handleRemoveFromHistory(record: UploadRecord) {
    try {
      await removeUpload(record.id);
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: error instanceof CdnApiError ? error.message : "Failed to remove from history",
      });
    }
  }

  if (!token) {
    return <SetupRequired />;
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.EmptyView title="No uploads yet" description="Uploads made from this Mac will show up here" />
      {uploads.map((record) => (
        <List.Item
          key={record.id}
          title={record.filename}
          subtitle={`${Math.round(record.size / 1024)} KB`}
          detail={
            <List.Item.Detail
              isLoading={measuringIds.has(record.id)}
              markdown={
                record.contentType.startsWith("image/")
                  ? buildImageMarkdown(record)
                  : `# ${record.filename}\n\nNo preview available for this content type.`
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Filename" text={record.filename} />
                  <List.Item.Detail.Metadata.Label title="Content Type" text={record.contentType} />
                  <List.Item.Detail.Metadata.Label title="Size" text={`${Math.round(record.size / 1024)} KB`} />
                  <List.Item.Detail.Metadata.Label
                    title="Uploaded"
                    text={new Date(record.createdAt).toLocaleString()}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link title="CDN Link" target={record.url} text={record.url} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Link" content={record.url} />
              <Action.OpenInBrowser title="Open in Browser" url={record.url} />
              <Action title="Delete from CDN" onAction={() => handleDeleteFromCdn(record)} />
              <Action title="Remove from History" onAction={() => handleRemoveFromHistory(record)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
