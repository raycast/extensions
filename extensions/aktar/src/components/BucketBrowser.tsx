import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useState } from "react";
import {
  createFolder,
  createTemporaryLink,
  deleteObject,
  getStatus,
  isConnectionError,
  listObjects,
  moveObject,
} from "../api/client";
import type { BucketFolder, BucketObject, Destination } from "../api/types";
import { showAktarFailure } from "../lib/errors";
import { FORMAT_TITLES, formatBytes, formatLink, isImageName, thumbnail } from "../lib/format";
import { resolveFormat } from "../lib/output";
import { ConnectionEmptyView } from "./ConnectionEmptyView";
import { QRCodeView } from "./QRCodeView";
import { UploadForm } from "./UploadForm";

type Entry = { type: "folder"; folder: BucketFolder } | { type: "object"; object: BucketObject };

const TEMPORARY_LINK_DURATIONS = [
  { title: "1 Hour", seconds: 60 * 60 },
  { title: "1 Day", seconds: 24 * 60 * 60 },
  { title: "7 Days", seconds: 7 * 24 * 60 * 60 },
];

/**
 * One folder of a destination's bucket, listed live (not just what Aktar
 * uploaded) and paged 1000 keys at a time as you scroll.
 */
export function BucketBrowser({ destination, prefix = "" }: { destination: Destination; prefix?: string }) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data: status } = useCachedPromise(getStatus, []);
  const format = resolveFormat(status);

  const { data, isLoading, error, pagination, revalidate } = useCachedPromise(
    (destinationId: string, folder: string) =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const listing = await listObjects(destinationId, folder, cursor);
        const entries: Entry[] = [
          ...listing.folders.map((folder): Entry => ({ type: "folder", folder })),
          ...listing.objects.map((object): Entry => ({ type: "object", object })),
        ];
        return {
          data: entries,
          hasMore: Boolean(listing.nextContinuationToken),
          cursor: listing.nextContinuationToken ?? undefined,
        };
      },
    [destination.id, prefix],
    {
      onError: (error) => {
        if (!isConnectionError(error)) showAktarFailure(error, "Couldn't list the bucket");
      },
    },
  );

  const folders = (data ?? []).flatMap((entry) => (entry.type === "folder" ? [entry.folder] : []));
  const objects = (data ?? []).flatMap((entry) => (entry.type === "object" ? [entry.object] : []));
  const location = `${destination.bucket}/${prefix}`;

  const sharedActions = (
    <>
      <Action.Push
        title="Upload Files Here"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd"], key: "u" }}
        target={<UploadForm destinationId={destination.id} prefix={prefix} onUploaded={revalidate} />}
      />
      <Action.Push
        title="New Folder"
        icon={Icon.NewFolder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={<NewFolderForm destination={destination} prefix={prefix} onCreated={revalidate} />}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={isShowingDetail && objects.length > 0}
      navigationTitle={location}
      searchBarPlaceholder={`Filter ${prefix ? prefix : destination.bucket}`}
    >
      {error && isConnectionError(error) ? (
        <ConnectionEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Folder}
          title={isLoading ? "Loading…" : "This Folder Is Empty"}
          description={isLoading ? undefined : "Upload files here with ⌘U."}
          actions={<ActionPanel>{sharedActions}</ActionPanel>}
        />
      )}
      <List.Section title="Folders">
        {folders.map((folder) => (
          <List.Item
            key={folder.prefix}
            icon={Icon.Folder}
            title={folder.name}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Folder"
                  icon={Icon.ArrowRight}
                  target={<BucketBrowser destination={destination} prefix={folder.prefix} />}
                />
                <Action.CopyToClipboard title="Copy Folder Path" content={folder.prefix} />
                {sharedActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Files" subtitle={objects.length > 0 ? String(objects.length) : undefined}>
        {objects.map((object) => (
          <List.Item
            key={object.key}
            icon={thumbnail(object.name, object.url)}
            title={object.name}
            accessories={
              isShowingDetail
                ? undefined
                : [
                    { text: formatBytes(object.size) },
                    ...(object.lastModified
                      ? [
                          {
                            date: new Date(object.lastModified),
                            tooltip: new Date(object.lastModified).toLocaleString(),
                          },
                        ]
                      : []),
                  ]
            }
            detail={<ObjectDetail destination={destination} object={object} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {object.url ? (
                    <>
                      <Action.CopyToClipboard
                        title={`Copy ${FORMAT_TITLES[format === "custom" ? "url" : format]}`}
                        content={formatLink(object.url, object.name, format)}
                      />
                      <Action.OpenInBrowser url={object.url} />
                      <Action.Push
                        title="Show QR Code"
                        icon={Icon.Mobile}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                        target={<QRCodeView name={object.name} link={object.url} />}
                      />
                    </>
                  ) : (
                    <>
                      <TemporaryLinkAction
                        destination={destination}
                        object={object}
                        seconds={3600}
                        title="Copy 1-Hour Link"
                      />
                      <Action.Push
                        title="Show 1-Hour Link QR Code"
                        icon={Icon.Mobile}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                        target={<TemporaryLinkQRCode destination={destination} object={object} seconds={3600} />}
                      />
                    </>
                  )}
                  <Action
                    title={isShowingDetail ? "Hide Preview" : "Show Preview"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => setIsShowingDetail((value) => !value)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  {object.url && (
                    <>
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={object.url}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      <Action.CopyToClipboard
                        title="Copy Markdown"
                        content={formatLink(object.url, object.name, "markdown")}
                      />
                      <Action.CopyToClipboard title="Copy HTML" content={formatLink(object.url, object.name, "html")} />
                    </>
                  )}
                  <ActionPanel.Submenu
                    title="Copy Temporary Link"
                    icon={Icon.Clock}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  >
                    {TEMPORARY_LINK_DURATIONS.map((duration) => (
                      <TemporaryLinkAction
                        key={duration.seconds}
                        destination={destination}
                        object={object}
                        seconds={duration.seconds}
                        title={duration.title}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <ActionPanel.Submenu
                    title="Show Temporary Link QR Code"
                    icon={Icon.Mobile}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  >
                    {TEMPORARY_LINK_DURATIONS.map((duration) => (
                      <Action.Push
                        key={duration.seconds}
                        title={duration.title}
                        icon={Icon.Clock}
                        target={
                          <TemporaryLinkQRCode destination={destination} object={object} seconds={duration.seconds} />
                        }
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action.CopyToClipboard
                    title="Copy Key"
                    content={object.key}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action.Push
                    title="Rename or Move"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<MoveForm destination={destination} object={object} onMoved={revalidate} />}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => confirmAndDelete(destination, object, revalidate)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>{sharedActions}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ObjectDetail({ destination, object }: { destination: Destination; object: BucketObject }) {
  const preview = object.url && isImageName(object.name) ? `![](${object.url})` : "";
  return (
    <List.Item.Detail
      markdown={preview || `### ${object.name}\n\nNo preview for this file.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={object.name} />
          <List.Item.Detail.Metadata.Label title="Key" text={object.key} />
          <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(object.size)} />
          {object.lastModified && (
            <List.Item.Detail.Metadata.Label title="Modified" text={new Date(object.lastModified).toLocaleString()} />
          )}
          <List.Item.Detail.Metadata.Label title="Destination" text={`${destination.name} (${destination.bucket})`} />
          {object.url ? (
            <List.Item.Detail.Metadata.Link title="Public Link" text={object.url} target={object.url} />
          ) : (
            <List.Item.Detail.Metadata.Label title="Public Link" text="No public base URL set" />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function TemporaryLinkAction({
  destination,
  object,
  seconds,
  title,
}: {
  destination: Destination;
  object: BucketObject;
  seconds: number;
  title: string;
}) {
  return (
    <Action
      title={title}
      icon={Icon.Clock}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Creating temporary link" });
        try {
          const link = await createTemporaryLink(destination.id, object.key, seconds);
          await Clipboard.copy(link.url);
          toast.style = Toast.Style.Success;
          toast.title = "Temporary link copied";
          toast.message = `Expires ${new Date(link.expiresAt).toLocaleString()}`;
        } catch (error) {
          await showAktarFailure(error, "Couldn't create a temporary link");
        }
      }}
    />
  );
}

/** A QR code for a temporary link, created when the view opens. */
function TemporaryLinkQRCode({
  destination,
  object,
  seconds,
}: {
  destination: Destination;
  object: BucketObject;
  seconds: number;
}) {
  return (
    <QRCodeView
      name={object.name}
      link={async () => {
        const link = await createTemporaryLink(destination.id, object.key, seconds);
        return { url: link.url, note: `Temporary link, expires ${new Date(link.expiresAt).toLocaleString()}.` };
      }}
    />
  );
}

async function confirmAndDelete(destination: Destination, object: BucketObject, onDeleted: () => void) {
  const confirmed = await confirmAlert({
    title: `Delete “${object.name}”?`,
    message: `It will be removed from ${destination.bucket} for good, and anyone with its link will get an error.`,
    icon: Icon.Trash,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${object.name}` });
  try {
    await deleteObject(destination.id, object.key);
    toast.style = Toast.Style.Success;
    toast.title = `Deleted ${object.name}`;
    onDeleted();
  } catch (error) {
    await showAktarFailure(error, "Couldn't delete the file");
  }
}

function MoveForm({
  destination,
  object,
  onMoved,
}: {
  destination: Destination;
  object: BucketObject;
  onMoved: () => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ key: string }>({
    initialValues: { key: object.key },
    validation: {
      key: (value) => {
        const key = value?.trim().replace(/^\/+|\/+$/g, "");
        if (!key) return "Enter a name";
        if (key === object.key) return "Pick a different name or folder";
      },
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Moving ${object.name}` });
      try {
        await moveObject(destination.id, object.key, values.key.trim());
        toast.style = Toast.Style.Success;
        toast.title = "Moved";
        toast.message = values.key.trim();
        onMoved();
        pop();
      } catch (error) {
        await showAktarFailure(error, "Couldn't move the file");
      }
    },
  });

  return (
    <Form
      navigationTitle={`Rename ${object.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename or Move" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Key"
        info="The full path inside the bucket. Change the name to rename, or the folder part to move. Links to the old key stop working."
        {...itemProps.key}
      />
      <Form.Description text="S3 has no real rename: Aktar copies the file to the new key, then deletes the old one." />
    </Form>
  );
}

function NewFolderForm({
  destination,
  prefix,
  onCreated,
}: {
  destination: Destination;
  prefix: string;
  onCreated: () => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    validation: {
      name: (value) => (value?.trim().replace(/^\/+|\/+$/g, "") ? undefined : "Enter a folder name"),
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating folder" });
      try {
        await createFolder(destination.id, prefix, values.name);
        toast.style = Toast.Style.Success;
        toast.title = `Created ${values.name.trim()}`;
        onCreated();
        pop();
      } catch (error) {
        await showAktarFailure(error, "Couldn't create the folder");
      }
    },
  });

  return (
    <Form
      navigationTitle={`New Folder in ${destination.bucket}/${prefix}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Folder" icon={Icon.NewFolder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="screenshots" {...itemProps.name} />
    </Form>
  );
}
