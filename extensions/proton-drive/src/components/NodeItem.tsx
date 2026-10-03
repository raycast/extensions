import { ReactNode } from "react";
import { Icon, Image, List } from "@raycast/api";
import { DriveNode } from "../lib/cli";
import { SortOrder, sortNodes } from "../lib/sort";
import { displayPath, NodeActions } from "./NodeActions";

/** Contents of the selected folder, loaded by the parent list (see useSelectedFolder). */
export interface FolderContents {
  nodes?: DriveNode[];
  isLoading: boolean;
}

export function NodeItem(props: {
  node: DriveNode;
  showPath?: boolean;
  contents?: FolderContents;
  sort?: SortOrder;
  extraActions?: ReactNode;
}) {
  const { node, showPath, contents, sort = "name", extraActions } = props;

  return (
    <List.Item
      id={node.uid}
      title={node.name}
      subtitle={showPath ? displayPath(node.parentPath) : undefined}
      icon={iconFor(node)}
      accessories={node.sharedByUrl ? [{ icon: Icon.Link, tooltip: "Shared by link" }] : undefined}
      detail={
        node.type === "folder" ? (
          <FolderDetail node={node} contents={contents} sort={sort} />
        ) : (
          <FileDetail node={node} />
        )
      }
      actions={<NodeActions node={node} extraActions={extraActions} />}
    />
  );
}

const PREVIEW_LIMIT = 30;
/** Icons from assets/ (with @dark variants), sized to sit inline with the text. */
const FOLDER_IMG = "![](folder.svg?raycast-width=16&raycast-height=16)";
const FILE_IMG = "![](file.svg?raycast-width=16&raycast-height=16)";
/** No content preview for files (it would mean downloading on every selection): a large icon instead. */
const FILE_IMG_LARGE = "![](file.svg?raycast-width=120&raycast-height=120)";
const LOADING = "…";
const NONE = "—";

/** The same rows for every folder, whatever its contents, so the panel doesn't jump around. */
function FolderDetail({ node, contents, sort }: { node: DriveNode; contents?: FolderContents; sort: SortOrder }) {
  // Same order as the list on the left.
  const children = contents?.nodes && sortNodes(contents.nodes, sort);
  const folders = children?.filter((c) => c.type === "folder") ?? [];
  const files = children?.filter((c) => c.type === "file") ?? [];
  const filesSize = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const lastChange = children
    ?.map((c) => c.modified)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

  const preview = !children
    ? "_Loading contents…_"
    : children.length === 0
      ? "_Empty folder_"
      : [...folders, ...files]
          .slice(0, PREVIEW_LIMIT)
          .map((c) => `${c.type === "folder" ? FOLDER_IMG : FILE_IMG} ${escapeMarkdown(c.name)}`)
          .join("  \n") +
        (children.length > PREVIEW_LIMIT ? `  \n_… and ${children.length - PREVIEW_LIMIT} more_` : "");

  const value = (text: string | undefined) => (children ? (text ?? NONE) : LOADING);

  return (
    <List.Item.Detail
      // Raycast keeps some metadata rows stale when their text changes in place: remount once loaded.
      key={children ? "loaded" : "loading"}
      isLoading={contents?.isLoading}
      markdown={`### ${escapeMarkdown(node.name)}\n\n${preview}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Folders" icon={Icon.Folder} text={value(String(folders.length))} />
          <List.Item.Detail.Metadata.Label title="Files" icon={Icon.Document} text={value(String(files.length))} />
          <List.Item.Detail.Metadata.Label
            title="Size of Files"
            text={value(files.length ? formatSize(filesSize) : undefined)}
          />
          <List.Item.Detail.Metadata.Label
            title="Last Change Inside"
            text={value(lastChange ? formatDate(lastChange) : undefined)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created" text={node.created ? formatDate(node.created) : NONE} />
          <List.Item.Detail.Metadata.Label title="Location" text={displayPath(node.parentPath)} />
          <SharingLabel node={node} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function FileDetail({ node }: { node: DriveNode }) {
  return (
    <List.Item.Detail
      markdown={`### ${escapeMarkdown(node.name)}\n\n${FILE_IMG_LARGE}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Kind" icon={iconFor(node)} text={kindOf(node)} />
          <List.Item.Detail.Metadata.Label title="Size" text={node.size !== undefined ? formatSize(node.size) : NONE} />
          <List.Item.Detail.Metadata.Label title="Modified" text={node.modified ? formatDate(node.modified) : NONE} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Uploaded" text={node.created ? formatDate(node.created) : NONE} />
          <List.Item.Detail.Metadata.Label title="Location" text={displayPath(node.parentPath)} />
          <SharingLabel node={node} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function SharingLabel({ node }: { node: DriveNode }) {
  const text = node.sharedByUrl ? "Public link" : node.shared ? "Shared with people" : "Private";
  return <List.Item.Detail.Metadata.Label title="Sharing" icon={node.shared ? Icon.Link : Icon.Lock} text={text} />;
}

function kindOf(node: DriveNode): string {
  const ext = node.name.includes(".") ? node.name.split(".").pop()!.toUpperCase() : undefined;
  const mt = node.mediaType ?? "";
  if (mt === "application/pdf") return "PDF document";
  if (mt.startsWith("image/")) return `${ext ?? "Image"} image`;
  if (mt.startsWith("video/")) return `${ext ?? "Video"} video`;
  if (mt.startsWith("audio/")) return `${ext ?? "Audio"} audio`;
  return ext ? `${ext} file` : mt || "File";
}

export function iconFor(node: DriveNode): Image.ImageLike {
  if (node.type === "folder") return Icon.Folder;
  const mt = node.mediaType ?? "";
  if (mt.startsWith("image/")) return Icon.Image;
  if (mt.startsWith("video/")) return Icon.FilmStrip;
  if (mt.startsWith("audio/")) return Icon.Music;
  if (mt === "application/pdf") return Icon.BlankDocument;
  if (/zip|tar|compressed|x-7z|rar/.test(mt)) return Icon.Box;
  if (/spreadsheet|excel|csv/.test(mt)) return Icon.BarChart;
  if (/presentation|powerpoint|keynote/.test(mt)) return Icon.Monitor;
  if (/json|javascript|xml|x-sh|x-python/.test(mt)) return Icon.Code;
  return Icon.Document;
}

export function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]#<>|])/g, "\\$1");
}
