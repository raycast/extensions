import { pathToFileURL } from "node:url";
import { Color, List } from "@raycast/api";
import type { ApiSave } from "pond-api";
import {
  escapeMarkdown,
  type FolderPath,
  formatBytes,
  formatDate,
  formatDimensions,
  formatDuration,
  kindName,
  ratingStars,
  saveTitle,
  sourceName,
} from "../lib/display";
import { hostname, isWebUrl } from "../lib/links";

function detailMarkdown(save: ApiSave, preview: string | null | undefined): string {
  const parts: string[] = [];
  if (preview) parts.push(`<img src="${pathToFileURL(preview).href}" height="220" />`);
  parts.push(`## ${escapeMarkdown(saveTitle(save))}`);
  if (save.description && save.description !== save.title) parts.push(escapeMarkdown(save.description));
  if (save.note) parts.push(`---\n\n**Note**\n\n${save.note}`);
  return parts.join("\n\n");
}

export function SaveDetail({
  save,
  preview,
  folders,
}: {
  save: ApiSave;
  preview: string | null | undefined;
  folders: ReadonlyMap<string, FolderPath>;
}) {
  const kind = kindName(save.kind);
  const size = formatDimensions(save.media);
  const stars = ratingStars(save.rating);
  const inFolders = save.folderIds.flatMap((id) => folders.get(id) ?? []);

  return (
    <List.Item.Detail
      markdown={detailMarkdown(save, preview)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Source" text={sourceName(save.source)} />
          {save.author && <List.Item.Detail.Metadata.Label title="Author" text={save.author} />}
          {isWebUrl(save.url) && (
            <List.Item.Detail.Metadata.Link title="Link" target={save.url} text={hostname(save.url)} />
          )}
          {kind && <List.Item.Detail.Metadata.Label title="Type" text={kind} />}
          {size && <List.Item.Detail.Metadata.Label title="Size" text={size} />}
          {save.media.duration ? (
            <List.Item.Detail.Metadata.Label title="Duration" text={formatDuration(save.media.duration)} />
          ) : null}
          {save.media.bytes ? (
            <List.Item.Detail.Metadata.Label title="File Size" text={formatBytes(save.media.bytes)} />
          ) : null}
          {stars && <List.Item.Detail.Metadata.Label title="Rating" text={stars} />}
          {save.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {save.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {inFolders.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Folders">
              {inFolders.map((folder) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={folder.id}
                  text={folder.path}
                  color={folder.color ?? Color.SecondaryText}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Saved" text={formatDate(save.savedAt)} />
          {save.publishedAt && (
            <List.Item.Detail.Metadata.Label title="Published" text={formatDate(save.publishedAt)} />
          )}
          {save.status === "ingesting" && (
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item text="Capturing" color={Color.Orange} />
            </List.Item.Detail.Metadata.TagList>
          )}
          {save.status === "failed" && (
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item text="Capture failed" color={Color.Red} />
            </List.Item.Detail.Metadata.TagList>
          )}
          {save.deletedAt && (
            <List.Item.Detail.Metadata.Label title="Moved to Trash" text={formatDate(save.deletedAt)} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
