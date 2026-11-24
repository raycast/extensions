import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listBlobs, readBlob } from "../lib/api";
import { errorMessage } from "../lib/format";

export function BlobList({ val }: { val: string }) {
  const { data, isLoading, error } = useCachedPromise(
    (identifier: string) => listBlobs({ type: "val", val: identifier }),
    [val],
  );

  const blobs = data?.blobs ?? [];

  return (
    <List isLoading={isLoading} navigationTitle={`Blobs · ${val}`} searchBarPlaceholder="Filter keys">
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not list blobs"
          description={errorMessage(error)}
        />
      ) : (
        <>
          <List.EmptyView icon={Icon.Box} title="No blobs" description="This val has no blob storage yet." />
          {blobs.map((blob) => (
            <List.Item
              key={blob.key}
              icon={Icon.Box}
              title={blob.key}
              accessories={[
                ...(blob.size !== undefined ? [{ text: formatBytes(blob.size) }] : []),
                ...(blob.lastModified ? [{ date: new Date(blob.lastModified) }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Read Blob" icon={Icon.Eye} target={<BlobDetail val={val} blobKey={blob.key} />} />
                  <Action.CopyToClipboard title="Copy Key" content={blob.key} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}

function BlobDetail({ val, blobKey }: { val: string; blobKey: string }) {
  const { data, isLoading, error } = useCachedPromise(
    (identifier: string, key: string) => readBlob({ type: "val", val: identifier }, key),
    [val, blobKey],
  );

  const content = data?.content;
  const markdown = error
    ? `## Could not read this blob\n\n${errorMessage(error)}`
    : content
      ? `\`\`\`\n${content}\n\`\`\``
      : "_This blob holds binary content._";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={blobKey}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Key" text={blobKey} />
          {data?.size !== undefined ? <Detail.Metadata.Label title="Size" text={formatBytes(data.size)} /> : null}
          {data?.contentType ? <Detail.Metadata.Label title="Type" text={data.contentType} /> : null}
          {data?.truncated ? <Detail.Metadata.Label title="Truncated" text="Showing the first window" /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {content ? <Action.CopyToClipboard title="Copy Content" content={content} /> : null}
          <Action.CopyToClipboard title="Copy Key" content={blobKey} />
        </ActionPanel>
      }
    />
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
