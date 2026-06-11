import { JSX, useEffect, useRef, useState } from "react";
import { List, Action, Icon } from "@raycast/api";
import {
  FileAsset,
  SearchResult,
  SearchResultType,
  formatDate,
  formatFileSize,
  getCommentCounts,
  getFile,
  getThumbnailUrl,
} from "../api/frameio";
import { debug } from "../debug";

export interface FileDetailExtras {
  thumbnailUrl?: string;
  projectName?: string;
  commentCount?: number;
  isLoadingComments?: boolean;
  versionCount?: number;
}

export function toggleDetailAction(
  showDetail: boolean,
  setShowDetail: (value: boolean | ((prev: boolean) => boolean)) => void
): JSX.Element {
  return (
    <Action
      title={showDetail ? "Hide Details" : "Show Details"}
      icon={showDetail ? Icon.EyeDisabled : Icon.Sidebar}
      onAction={() => setShowDetail((v) => !v)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    />
  );
}

function formatMediaType(mediaType?: string): string | undefined {
  if (!mediaType) return undefined;
  const [category, subtype] = mediaType.split("/");
  if (!subtype) return mediaType;
  const label = subtype.replace(/[-_]/g, " ").toUpperCase();
  if (category === "video") return `Video (${label})`;
  if (category === "image") return `Image (${label})`;
  if (category === "audio") return `Audio (${label})`;
  return mediaType;
}

function formatStatus(status?: string): string | undefined {
  if (!status) return undefined;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function typeLabel(type: SearchResultType | "file" | "folder" | "version_stack"): string {
  if (type === "file") return "File";
  if (type === "folder") return "Folder";
  if (type === "project") return "Project";
  if (type === "version_stack") return "Version Stack";
  return "Other";
}

export function buildFileDetail(file: FileAsset, extras: FileDetailExtras = {}): JSX.Element {
  const { thumbnailUrl = getThumbnailUrl(file), projectName, commentCount, isLoadingComments, versionCount } = extras;

  return (
    <List.Item.Detail
      markdown={thumbnailUrl ? `![](${thumbnailUrl})` : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          {projectName && <List.Item.Detail.Metadata.Label title="Project" text={projectName} />}
          <List.Item.Detail.Metadata.Label title="Type" text={formatMediaType(file.media_type) ?? "File"} />
          <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(file.file_size)} />
          <List.Item.Detail.Metadata.Label title="Status" text={formatStatus(file.status) ?? "—"} />
          {versionCount && versionCount > 1 && (
            <List.Item.Detail.Metadata.Label title="Versions" text={`v${versionCount}`} />
          )}
          <List.Item.Detail.Metadata.Label
            title="Comments"
            text={isLoadingComments ? "…" : commentCount !== undefined ? String(commentCount) : "0"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Uploaded" text={formatDate(file.created_at)} />
          <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(file.updated_at)} />
          {file.view_url && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Frame.io Link" target={file.view_url} text={file.view_url} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function buildSearchResultDetail(result: SearchResult, extras: FileDetailExtras = {}): JSX.Element {
  const isFile = result.type === "file";
  const { thumbnailUrl, commentCount, isLoadingComments } = extras;

  return (
    <List.Item.Detail
      markdown={isFile && thumbnailUrl ? `![](${thumbnailUrl})` : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={typeLabel(result.type)} />
          {result.file_size !== undefined && (
            <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(result.file_size)} />
          )}
          {result.media_type && (
            <List.Item.Detail.Metadata.Label
              title="MIME Type"
              text={formatMediaType(result.media_type) ?? result.media_type}
            />
          )}
          {isFile && (
            <List.Item.Detail.Metadata.Label
              title="Comments"
              text={isLoadingComments ? "…" : commentCount !== undefined ? String(commentCount) : "0"}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Uploaded" text={formatDate(result.created_at)} />
          <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(result.updated_at)} />
          {result.view_url && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Frame.io Link" target={result.view_url} text={result.view_url} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function buildFolderOrProjectDetail(
  type: "folder" | "project",
  dates: { created_at: string; updated_at: string },
  viewUrl?: string
): JSX.Element {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={typeLabel(type)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created" text={formatDate(dates.created_at)} />
          <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(dates.updated_at)} />
          {viewUrl && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Frame.io Link" target={viewUrl} text={viewUrl} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface FileRef {
  id: string;
  project_id: string;
}

export function useFileDetailEnrichment(
  accountId: string,
  files: FileRef[],
  enabled: boolean
): {
  thumbnails: Record<string, string>;
  commentCounts: Record<string, number>;
  isLoadingComments: boolean;
} {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const fetchedThumbsRef = useRef<Set<string>>(new Set());

  const fileKey = files.map((f) => f.id).join(",");

  useEffect(() => {
    if (!enabled || !accountId || files.length === 0) return;

    const fileIds = files.map((f) => f.id);

    setIsLoadingComments(true);
    getCommentCounts(accountId, fileIds)
      .then((counts) => setCommentCounts((prev) => ({ ...prev, ...counts })))
      .catch((err) => debug.error("Failed to load comment counts", err))
      .finally(() => setIsLoadingComments(false));

    const missingThumbs = files.filter((f) => !fetchedThumbsRef.current.has(f.id));
    if (missingThumbs.length > 0) {
      (async () => {
        const BATCH = 5;
        for (let i = 0; i < missingThumbs.length; i += BATCH) {
          const batch = missingThumbs.slice(i, i + BATCH);
          const results = await Promise.all(
            batch.map(async (file) => {
              fetchedThumbsRef.current.add(file.id);
              try {
                const full = await getFile(accountId, file.id);
                const url = getThumbnailUrl(full);
                return url ? { id: file.id, url } : null;
              } catch {
                return null;
              }
            })
          );
          const updates: Record<string, string> = {};
          for (const r of results) {
            if (r) updates[r.id] = r.url;
          }
          if (Object.keys(updates).length > 0) {
            setThumbnails((prev) => ({ ...prev, ...updates }));
          }
          if (i + BATCH < missingThumbs.length) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
      })();
    }
  }, [enabled, accountId, fileKey, files]);

  return { thumbnails, commentCounts, isLoadingComments };
}
