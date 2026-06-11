import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  List,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { basename, dirname, extname, join } from "path";
import { existsSync, readFileSync, statSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { execFile, execFileSync } from "child_process";
import { useState, useEffect } from "react";
import { useTransferHistory } from "./hooks/useTransferHistory";
import { TransferRecord, formatFileSize } from "./utils/history";
import { getCrocPath, buildCrocArgs } from "./utils/croc";
import { spawnCrocSend } from "./utils/process";
import { addRecord, updateRecord } from "./utils/history";
import { cleanStaleInProgressRecords } from "./utils/history";

// Session ID for stale in_progress record cleanup
const SESSION_ID = Math.random().toString(36).slice(2);

function buildDeepLink(phrase: string): string {
  return `raycast://extensions/wilton/croc-transfer/receive-file?arguments=${encodeURIComponent(JSON.stringify({ code: phrase }))}`;
}

type DateGroup = "Today" | "Yesterday" | "Earlier";

function getDateGroup(timestamp: number): DateGroup {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  if (timestamp >= todayStart) return "Today";
  if (timestamp >= yesterdayStart) return "Yesterday";
  return "Earlier";
}

const IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".heic",
  ".heif",
  ".bmp",
  ".tiff",
  ".tif",
]);
const TEXT_EXTS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".csv",
  ".log",
  ".sh",
  ".py",
  ".js",
  ".ts",
  ".swift",
  ".go",
  ".rs",
  ".c",
  ".cpp",
  ".h",
  ".html",
  ".css",
  ".xml",
]);
const QUICKLOOK_THUMB_EXTS = new Set([
  ".pvt",
  ".mov",
  ".mp4",
  ".m4v",
  ".avi",
  ".mkv",
  ".webm",
  ".pdf",
]);

const QL_THUMB_DIR = join(tmpdir(), "raycast-croc-ql-thumbs");

function encodeFilePath(filePath: string): string {
  return filePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

const PREVIEW_MAX_W = 500;
const PREVIEW_MAX_H = 190;

function getImageDimensions(filePath: string): { w: number; h: number } | null {
  try {
    const out = execFileSync(
      "/usr/bin/sips",
      ["-g", "pixelWidth", "-g", "pixelHeight", filePath],
      {
        encoding: "utf8",
        timeout: 3000,
      },
    );
    const w = parseInt(out.match(/pixelWidth:\s*(\d+)/)?.[1] ?? "0", 10);
    const h = parseInt(out.match(/pixelHeight:\s*(\d+)/)?.[1] ?? "0", 10);
    if (w > 0 && h > 0) return { w, h };
    return null;
  } catch {
    return null;
  }
}

function scaleToBounds(w: number, h: number): { w: number; h: number } {
  const scale = Math.min(1, PREVIEW_MAX_W / w, PREVIEW_MAX_H / h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function imgTag(src: string, dims: { w: number; h: number } | null): string {
  if (dims) return `<img src="${src}" width="${dims.w}" height="${dims.h}" />`;
  return `<img src="${src}" height="${PREVIEW_MAX_H}" />`;
}

function loadFilePreview(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();

  if (IMAGE_EXTS.has(ext)) {
    const raw = getImageDimensions(filePath);
    const dims = raw ? scaleToBounds(raw.w, raw.h) : null;
    return imgTag(`file://${encodeFilePath(filePath)}`, dims);
  }

  if (TEXT_EXTS.has(ext)) {
    try {
      const MAX_PREVIEW_BYTES = 100_000;
      const stat = statSync(filePath);
      if (stat.size > MAX_PREVIEW_BYTES) return null;
      const content = readFileSync(filePath, "utf8");
      return ext === ".md"
        ? content
        : `\`\`\`${ext.slice(1)}\n${content}\n\`\`\``;
    } catch {
      return null;
    }
  }

  return null;
}

function fileMetadataMarkdown(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  try {
    const stat = statSync(filePath);
    const sizeKB = (stat.size / 1024).toFixed(1);
    const modified = stat.mtime.toLocaleString("en-US");
    return `## ${basename(filePath)}\n\n| | |\n|---|---|\n| **Format** | \`${ext || "unknown"}\` |\n| **Size** | ${sizeKB} KB |\n| **Modified** | ${modified} |\n\n*Press ⌘Y to open with Quick Look, or ⌘O to open with the default app.*`;
  } catch {
    return `## ${basename(filePath)}\n\n*Press ⌘Y to open with Quick Look.*`;
  }
}

async function generateQLThumbnail(filePath: string): Promise<string | null> {
  try {
    mkdirSync(QL_THUMB_DIR, { recursive: true });
    await new Promise<void>((resolve, reject) => {
      execFile(
        "/usr/bin/qlmanage",
        ["-t", "-s", "800", "-o", QL_THUMB_DIR, filePath],
        (err) => {
          if (
            err &&
            !existsSync(join(QL_THUMB_DIR, basename(filePath) + ".png"))
          ) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
    const thumbPath = join(QL_THUMB_DIR, basename(filePath) + ".png");
    if (existsSync(thumbPath)) {
      const raw = getImageDimensions(thumbPath);
      const dims = raw ? scaleToBounds(raw.w, raw.h) : null;
      return imgTag(`file://${encodeFilePath(thumbPath)}`, dims);
    }
    return null;
  } catch {
    return null;
  }
}

async function reSend(record: TransferRecord) {
  const crocPath = getCrocPath();
  if (!crocPath) {
    await showToast({ style: Toast.Style.Failure, title: "croc not found" });
    return;
  }
  const existing = record.files.filter((f) => existsSync(f));
  if (existing.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Files no longer exist",
    });
    return;
  }
  const args = buildCrocArgs("send", existing);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Re-sending…",
  });
  let recordId: string | null = null;
  spawnCrocSend(
    crocPath,
    args,
    async (phrase) => {
      await Clipboard.copy(phrase);
      toast.style = Toast.Style.Animated;
      toast.title = "Waiting for receiver";
      toast.message = phrase;
      const record = await addRecord({
        type: "send",
        files: existing,
        phrase,
        status: "in_progress",
        sessionId: SESSION_ID,
      });
      recordId = record.id;
    },
    (p) => {
      toast.message = `${p.percent}%`;
    },
    async () => {
      if (recordId) await updateRecord(recordId, { status: "success" });
      toast.style = Toast.Style.Success;
      toast.title = "Re-send complete";
    },
    async (err) => {
      if (recordId) await updateRecord(recordId, { status: "failed" });
      toast.style = Toast.Style.Failure;
      toast.title = "Re-send failed";
      toast.message = err.message;
    },
  );
}

function RecordDetail({ record }: { record: TransferRecord }) {
  const dirPath = record.files[0] ? dirname(record.files[0]) : null;
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);

  useEffect(() => {
    const file = record.files.find((f) => existsSync(f));
    if (!file) return;

    const ext = extname(file).toLowerCase();

    if (QUICKLOOK_THUMB_EXTS.has(ext)) {
      setMarkdown(fileMetadataMarkdown(file));
      generateQLThumbnail(file).then((thumb) => {
        if (thumb) setMarkdown(thumb);
      });
      return;
    }

    const preview = loadFilePreview(file);
    setMarkdown(preview ?? fileMetadataMarkdown(file));
  }, [record.id]);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={record.type === "send" ? "Sent" : "Received"}
            icon={{
              source: record.type === "send" ? Icon.Upload : Icon.Download,
              tintColor: record.type === "send" ? Color.Blue : Color.Green,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={
              record.status === "success"
                ? "Success"
                : record.status === "failed"
                  ? "Failed"
                  : record.status === "cancelled"
                    ? "Cancelled"
                    : "In Progress"
            }
            icon={{
              source:
                record.status === "success"
                  ? Icon.CheckCircle
                  : record.status === "failed"
                    ? Icon.XMarkCircle
                    : Icon.MinusCircle,
              tintColor:
                record.status === "success"
                  ? Color.Green
                  : record.status === "failed"
                    ? Color.Red
                    : Color.SecondaryText,
            }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Code Phrase"
            text={record.phrase}
            icon={Icon.Key}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Date"
            text={new Date(record.timestamp).toLocaleString("en-US")}
            icon={Icon.Clock}
          />
          {record.size !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Size"
              text={formatFileSize(record.size)}
              icon={Icon.HardDrive}
            />
          )}
          {dirPath && (
            <List.Item.Detail.Metadata.Label
              title="Folder"
              text={dirPath}
              icon="📥"
            />
          )}
          {record.files.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              {record.files.map((f, i) => (
                <List.Item.Detail.Metadata.Label
                  key={i}
                  title={
                    i === 0 ? `File${record.files.length > 1 ? "s" : ""}` : ""
                  }
                  text={basename(f)}
                  icon={
                    existsSync(f)
                      ? Icon.Document
                      : {
                          source: Icon.Document,
                          tintColor: Color.SecondaryText,
                        }
                  }
                />
              ))}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function RecordItem({
  record,
  onRemove,
  onClearAll,
}: {
  record: TransferRecord;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}) {
  const dirPath = record.files[0] ? dirname(record.files[0]) : null;
  const filesExist = record.files.some((f) => existsSync(f));
  const firstExistingFile = record.files.find((f) => existsSync(f));
  const statusColor =
    record.status === "success"
      ? Color.Green
      : record.status === "failed"
        ? Color.Red
        : Color.SecondaryText;

  const accessories: List.Item.Accessory[] = [
    { date: new Date(record.timestamp) },
  ];
  if (record.files.length > 1) {
    accessories.unshift({ tag: { value: `${record.files.length} files` } });
  }

  return (
    <List.Item
      icon={{
        source: record.type === "send" ? Icon.Upload : Icon.Download,
        tintColor: statusColor,
      }}
      title={record.phrase}
      keywords={record.files.map((f) => basename(f))}
      quickLook={
        firstExistingFile
          ? { path: firstExistingFile, name: basename(firstExistingFile) }
          : undefined
      }
      accessories={accessories}
      detail={<RecordDetail record={record} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {firstExistingFile && (
              <Action.ToggleQuickLook
                shortcut={{ modifiers: ["cmd"], key: "y" }}
              />
            )}
            {filesExist && (
              <Action
                title="Open File"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => {
                  if (firstExistingFile) open(firstExistingFile);
                }}
              />
            )}
            <Action
              title="Copy Code Phrase"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(record.phrase);
                await showHUD(`Copied: ${record.phrase}`);
              }}
            />
            <Action
              title="Copy Deep Link"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(buildDeepLink(record.phrase));
                await showHUD("Deep Link copied!");
              }}
            />
            {record.type === "send" && filesExist && (
              <Action
                title="Re-Send Files"
                icon={Icon.Upload}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => reSend(record)}
              />
            )}
            {dirPath && existsSync(dirPath) && (
              <Action
                title="Show in Finder"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => open(dirPath)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Record"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                await onRemove(record.id);
                await showHUD("Record deleted");
              }}
            />
            <Action
              title="Clear All History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
              onAction={onClearAll}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function TransferHistory() {
  const { history, isLoading, remove, clear } = useTransferHistory();

  // Clean up stale in_progress records from previous sessions
  useEffect(() => {
    cleanStaleInProgressRecords(SESSION_ID);
  }, []);

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "This will permanently delete all transfer records.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await clear();
      await showHUD("History cleared");
    }
  }

  // Group records by date
  const groups: Record<DateGroup, TransferRecord[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const r of history) {
    groups[getDateGroup(r.timestamp)].push(r);
  }
  const groupOrder: DateGroup[] = ["Today", "Yesterday", "Earlier"];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search by filename or code phrase…"
      actions={
        history.length > 0 ? (
          <ActionPanel>
            <Action
              title="Clear All History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleClearAll}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {history.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Transfer History"
          description="Send or receive files with croc to see your history here."
        />
      )}
      {groupOrder.map((group) =>
        groups[group].length > 0 ? (
          <List.Section
            key={group}
            title={group}
            subtitle={`${groups[group].length}`}
          >
            {groups[group].map((r) => (
              <RecordItem
                key={r.id}
                record={r}
                onRemove={remove}
                onClearAll={handleClearAll}
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}
