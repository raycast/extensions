import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { deleteUpload, getStatus, isConnectionError, listDestinations, listUploads } from "./api/client";
import type { OutputFormat, Upload } from "./api/types";
import { BucketBrowser } from "./components/BucketBrowser";
import { ConnectionEmptyView } from "./components/ConnectionEmptyView";
import { UploadForm } from "./components/UploadForm";
import { showAktarFailure } from "./lib/errors";
import { formatExpiryDate } from "./lib/expiry";
import { destinationIcon, FORMAT_TITLES, formatBytes, isImageUpload, parentPrefix, thumbnail } from "./lib/format";
import { resolveFormat } from "./lib/output";

const ALL_DESTINATIONS = "all";

export default function Command() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("search-uploads-detail", true);
  const [destinationFilter, setDestinationFilter] = useState(ALL_DESTINATIONS);
  const { data: status } = useCachedPromise(getStatus, []);
  const { data: destinations } = useCachedPromise(listDestinations, []);
  const {
    data: uploads,
    isLoading,
    error,
    mutate,
    revalidate,
  } = useCachedPromise(() => listUploads({ limit: 1000 }), [], {
    onError: (error) => {
      if (!isConnectionError(error)) showAktarFailure(error, "Couldn't load your uploads");
    },
  });

  const format = resolveFormat(status);
  const visible = (uploads ?? []).filter(
    (upload) => destinationFilter === ALL_DESTINATIONS || upload.destinationId === destinationFilter,
  );

  async function remove(upload: Upload) {
    const confirmed = await confirmAlert({
      title: `Delete “${upload.filename}”?`,
      message: `It will be deleted from ${upload.destinationName} and removed from your history. Anyone with its link will get an error.`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${upload.filename}` });
    try {
      await mutate(deleteUpload(upload.id), {
        optimisticUpdate: (current) => current?.filter((candidate) => candidate.id !== upload.id),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${upload.filename}`;
    } catch (error) {
      await showAktarFailure(error, "Couldn't delete the upload");
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && visible.length > 0}
      searchBarPlaceholder="Search uploads by name or key"
      searchBarAccessory={
        destinations && destinations.length > 1 ? (
          <List.Dropdown tooltip="Destination" storeValue onChange={setDestinationFilter}>
            <List.Dropdown.Item title="All Destinations" value={ALL_DESTINATIONS} icon={Icon.Globe} />
            <List.Dropdown.Section>
              {destinations.map((destination) => (
                <List.Dropdown.Item
                  key={destination.id}
                  title={destination.name}
                  value={destination.id}
                  icon={destinationIcon(destination)}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {error && isConnectionError(error) ? (
        <ConnectionEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Upload}
          title={isLoading ? "Loading…" : "No Uploads Yet"}
          description={isLoading ? undefined : "Files you upload with Aktar show up here."}
          actions={
            <ActionPanel>
              <Action.Push title="Upload File" icon={Icon.Upload} target={<UploadForm onUploaded={revalidate} />} />
            </ActionPanel>
          }
        />
      )}
      {visible.map((upload) => {
        const destination = destinations?.find((candidate) => candidate.id === upload.destinationId);
        return (
          <List.Item
            key={upload.id}
            icon={thumbnail(upload.filename, upload.url)}
            title={upload.filename}
            keywords={[upload.objectKey, upload.destinationName]}
            accessories={
              isShowingDetail
                ? undefined
                : [
                    ...(upload.expiresAt
                      ? [
                          {
                            tag: { value: `Deletes ${formatExpiryDate(upload.expiresAt)}`, color: Color.Orange },
                            tooltip: `Aktar deletes this file on ${new Date(upload.expiresAt).toLocaleString()}`,
                          },
                        ]
                      : []),
                    { text: formatBytes(upload.size) },
                    { date: new Date(upload.createdAt), tooltip: new Date(upload.createdAt).toLocaleString() },
                  ]
            }
            detail={<UploadDetail upload={upload} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title={`Copy ${FORMAT_TITLES[format]}`} content={upload.formats[format]} />
                  <Action.Paste title={`Paste ${FORMAT_TITLES[format]}`} content={upload.formats[format]} />
                  <Action.OpenInBrowser url={upload.url} />
                  <Action
                    title={isShowingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => setIsShowingDetail(!isShowingDetail)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy As">
                  {(Object.keys(FORMAT_TITLES) as OutputFormat[])
                    .filter((candidate) => candidate !== format && showsFormat(candidate))
                    .map((candidate) => (
                      <Action.CopyToClipboard
                        key={candidate}
                        title={`Copy ${FORMAT_TITLES[candidate]}`}
                        content={upload.formats[candidate]}
                      />
                    ))}
                  <Action.CopyToClipboard
                    title="Copy Key"
                    content={upload.objectKey}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {destination && (
                    <Action.Push
                      title="Show in Bucket"
                      icon={Icon.Folder}
                      shortcut={Keyboard.Shortcut.Common.Open}
                      target={<BucketBrowser destination={destination} prefix={parentPrefix(upload.objectKey)} />}
                    />
                  )}
                  <Action
                    title="Open Aktar Library"
                    icon={Icon.AppWindowSidebarLeft}
                    shortcut={Keyboard.Shortcut.Common.OpenWith}
                    onAction={() => open("aktar://library")}
                  />
                  <Action.Push
                    title="Upload File"
                    icon={Icon.Upload}
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                    target={<UploadForm onUploaded={revalidate} />}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Upload"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => remove(upload)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/** The custom template only means something when it's the one Aktar is set to. */
function showsFormat(format: OutputFormat) {
  if (format !== "custom") return true;
  return getPreferenceValues<Preferences>().copyFormat === "aktar";
}

function UploadDetail({ upload }: { upload: Upload }) {
  const markdown = isImageUpload(upload) ? `![](${upload.url})` : `### ${upload.filename}\n\nNo preview for this file.`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="File" text={upload.filename} />
          <List.Item.Detail.Metadata.Label title="Key" text={upload.objectKey} />
          <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(upload.size)} />
          <List.Item.Detail.Metadata.Label title="Type" text={upload.mimeType} />
          <List.Item.Detail.Metadata.Label title="Uploaded" text={new Date(upload.createdAt).toLocaleString()} />
          {upload.expiresAt && (
            <List.Item.Detail.Metadata.TagList title="Deletes">
              <List.Item.Detail.Metadata.TagList.Item
                text={new Date(upload.expiresAt).toLocaleString()}
                color={Color.Orange}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Destination" text={upload.destinationName} />
          <List.Item.Detail.Metadata.Link title="Link" text={upload.url} target={upload.url} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
