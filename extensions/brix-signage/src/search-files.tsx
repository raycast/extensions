import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { accountId, cacheImage, consoleUrl, getPage, sameAccount } from "./api";
import { ErrorView } from "./error-view";
import { FILE_KINDS, bytes, duration, fileIcon, kindTitle, relative } from "./format";
import { ChooseScreen } from "./pickers";
import { MediaFile } from "./types";

const PAGE = 50;

export default function SearchFiles() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");

  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(
    // The account id keeps each key's lists apart in the cache.
    (account: string, q: string, k: string) => async (options: { cursor?: string }) => {
      sameAccount(account);
      const page = await getPage<MediaFile>("/v1/media", {
        search: q || undefined,
        kind: k || undefined,
        limit: PAGE,
        cursor: options.cursor,
      });
      return { data: page.data, hasMore: !!page.nextCursor, cursor: page.nextCursor ?? undefined };
    },
    [accountId(), search, kind],
    { keepPreviousData: true, failureToastOptions: { title: "Could not load files" } },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail
      searchBarPlaceholder="Search files by name"
      onSearchTextChange={setSearch}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="File Type" storeValue onChange={setKind}>
          {FILE_KINDS.map((k) => (
            <List.Dropdown.Item key={k.value} title={k.title} value={k.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error && !data?.length ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Image}
          title={search ? "No files match the search" : "No files"}
          description={search ? "Try a different name." : "Upload a file in Brix to see it here."}
        />
      )}
      {(data ?? []).map((file) => (
        <List.Item
          key={file.id}
          icon={fileIcon(file)}
          title={file.name}
          detail={<FileDetail file={file} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Brix" url={consoleUrl.file(file.id)} />
              <Action.Push
                title="Play on Screen"
                icon={Icon.Play}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "p" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
                }}
                target={<ChooseScreen contentKind="media" contentId={file.id} contentName={file.name} />}
              />
              <Action.CopyToClipboard title="Copy File ID" content={file.id} shortcut={Keyboard.Shortcut.Common.Copy} />
              <Action.CopyToClipboard title="Copy Link" content={consoleUrl.file(file.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** A video has a poster. An image has no thumbnail: Brix sends a small copy of the image itself. */
function previewPath(file: MediaFile): string | null {
  if (file.thumbnailUrl) return file.thumbnailUrl;
  if (file.kind === "image") return `/v1/media/${encodeURIComponent(file.id)}/file?w=640`;
  return null;
}

function FileDetail({ file }: { file: MediaFile }) {
  const { data: image, isLoading } = useCachedPromise(
    (account: string, path: string | null, id: string, rev: string) =>
      path ? cacheImage(path, `${account}-file-${id}-${rev}`) : Promise.resolve(null),
    [accountId(), previewPath(file), file.id, file.updatedAt.replace(/\D/g, "")],
    { onError: () => undefined },
  );
  const size = file.width && file.height ? `${file.width} × ${file.height}` : null;
  const length = duration(file.durationSec);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={image ? `![${file.name}](${image}?raycast-height=200)` : ""}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={kindTitle(file.kind)} icon={fileIcon(file)} />
          {file.state !== "ready" ? (
            <List.Item.Detail.Metadata.Label title="State" text={kindTitle(file.state)} />
          ) : null}
          {size ? <List.Item.Detail.Metadata.Label title="Size" text={size} /> : null}
          {length ? <List.Item.Detail.Metadata.Label title="Length" text={length} /> : null}
          {file.bytes ? <List.Item.Detail.Metadata.Label title="File Size" text={bytes(file.bytes)} /> : null}
          <List.Item.Detail.Metadata.Label
            title="Used In"
            text={file.usageCount === 1 ? "1 place" : `${file.usageCount} places`}
          />
          {file.uploadedByName ? (
            <List.Item.Detail.Metadata.Label title="Uploaded By" text={file.uploadedByName} />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Added" text={relative(file.createdAt)} />
          {file.tags && file.tags.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {file.tags.map((t) => (
                <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="File ID" text={file.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
