import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useState } from "react";
import { formatBytes, parseSnapzyDate } from "./snapzy";
import { dbErrorProps, dbMissingProps, ROW_LIMIT, TryAgainAction, useSnapzyDB } from "./snapzy-db";

function formatRelativeDate(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

type CaptureRow = {
  id: string;
  filePath: string;
  fileName: string;
  captureType: "screenshot" | "video";
  fileSize: number | null;
  capturedAt: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailPath: string | null;
};

export default function Command() {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // typeFilter only ever holds our own dropdown values, so interpolation is safe.
  const query = `
    SELECT id, filePath, fileName, captureType, fileSize, capturedAt, width, height, duration, thumbnailPath
    FROM captureHistoryRecord
    WHERE isDeleted = 0 ${typeFilter === "all" ? "" : `AND captureType = '${typeFilter}'`}
    ORDER BY capturedAt DESC
    LIMIT ${ROW_LIMIT}`;

  const { rows, isLoading, error, permissionView, revalidate, dbExists } = useSnapzyDB<CaptureRow>(query);
  if (permissionView) return permissionView;

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      fit={Grid.Fit.Contain}
      aspectRatio="16/9"
      inset={Grid.Inset.Small}
      searchBarPlaceholder="Filter captures by file name"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Capture Type" storeValue onChange={setTypeFilter}>
          <Grid.Dropdown.Item title="All" value="all" />
          <Grid.Dropdown.Item title="Screenshots" value="screenshot" />
          <Grid.Dropdown.Item title="Videos" value="video" />
        </Grid.Dropdown>
      }
    >
      {!dbExists ? (
        <Grid.EmptyView {...dbMissingProps("Install Snapzy and take a capture — your history appears here.")} />
      ) : error ? (
        <Grid.EmptyView
          {...dbErrorProps("capture history")}
          actions={
            <ActionPanel>
              <TryAgainAction onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : !isLoading && rows.length === 0 ? (
        typeFilter === "all" ? (
          <Grid.EmptyView
            icon={Icon.Image}
            title="No captures yet"
            description="Take a screenshot or recording with Snapzy and it appears here."
          />
        ) : (
          <Grid.EmptyView
            icon={typeFilter === "video" ? Icon.Video : Icon.Image}
            title={typeFilter === "video" ? "No videos in your history" : "No screenshots in your history"}
            description="Switch the type filter above to All to see every capture."
          />
        )
      ) : (
        <Grid.Section title={rows.length >= ROW_LIMIT ? `Latest ${ROW_LIMIT} captures` : undefined}>
          {rows.map((row) => {
            const isVideo = row.captureType === "video";
            const source = isVideo ? row.thumbnailPath || Icon.Video : row.filePath;
            const capturedAt = parseSnapzyDate(row.capturedAt);
            const relativeDate = capturedAt ? formatRelativeDate(capturedAt) : undefined;
            const facts = [
              row.width && row.height ? `${row.width}×${row.height}` : null,
              isVideo && row.duration ? formatDuration(row.duration) : null,
              row.fileSize != null ? formatBytes(row.fileSize) : null,
            ].filter(Boolean);
            const openFile = (
              <Action.Open title="Open File" target={row.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            );
            const paste = <Action.Paste title="Paste in Frontmost App" content={{ file: row.filePath }} />;
            const copyFile = (
              <Action.CopyToClipboard
                title={
                  isVideo
                    ? row.fileSize != null
                      ? `Copy Video (${formatBytes(row.fileSize)})`
                      : "Copy Video"
                    : "Copy Image"
                }
                content={{ file: row.filePath }}
              />
            );
            return (
              <Grid.Item
                key={row.id}
                content={{
                  tooltip: [row.fileName, facts.join(" · "), capturedAt?.toLocaleString()].filter(Boolean).join("\n"),
                  value: { source, fallback: isVideo ? Icon.Video : Icon.Image },
                }}
                title={row.fileName}
                subtitle={isVideo ? ["Video", relativeDate].filter(Boolean).join(" · ") : relativeDate}
                actions={
                  <ActionPanel>
                    {/* ↵ copies a screenshot, but opens a video: reflexively
                        clipboard-loading a multi-hundred-MB file is never the intent. */}
                    {isVideo ? openFile : copyFile}
                    {paste}
                    {isVideo ? copyFile : openFile}
                    <Action.ShowInFinder path={row.filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                    <Action.CopyToClipboard
                      title="Copy File Path"
                      content={row.filePath}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
