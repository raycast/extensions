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
import { TransferRecord } from "./utils/history";
import { getCrocPath, buildCrocArgs } from "./utils/croc";
import { spawnCrocSend } from "./utils/process";
import { addRecord } from "./utils/history";

function buildDeepLink(phrase: string): string {
  return `raycast://extensions/wilton/croc-transfer/receive-file?arguments=${encodeURIComponent(JSON.stringify({ code: phrase }))}`;
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".heic", ".heif", ".bmp", ".tiff", ".tif"]);
const TEXT_EXTS = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".csv", ".log", ".sh", ".py", ".js", ".ts", ".swift", ".go", ".rs", ".c", ".cpp", ".h", ".html", ".css", ".xml"]);
// Formats that can't be rendered inline but qlmanage can generate a thumbnail for
const QUICKLOOK_THUMB_EXTS = new Set([".pvt", ".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm", ".pdf"]);

const QL_THUMB_DIR = join(tmpdir(), "raycast-croc-ql-thumbs");

function encodeFilePath(filePath: string): string {
  return filePath.split("/").map((seg) => encodeURIComponent(seg)).join("/");
}

// Raycast List detail panel: markdown visible area is ~170-200px tall
const PREVIEW_MAX_W = 500;
const PREVIEW_MAX_H = 190;

/** Use sips to get pixel dimensions of an image file. Returns null if unavailable. */
function getImageDimensions(filePath: string): { w: number; h: number } | null {
  try {
    const out = execFileSync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
      encoding: "utf8",
      timeout: 3000,
    });
    const w = parseInt(out.match(/pixelWidth:\s*(\d+)/)?.[1] ?? "0", 10);
    const h = parseInt(out.match(/pixelHeight:\s*(\d+)/)?.[1] ?? "0", 10);
    if (w > 0 && h > 0) return { w, h };
    return null;
  } catch {
    return null;
  }
}

/** Scale to fit within PREVIEW_MAX_W × PREVIEW_MAX_H, preserving aspect ratio. */
function scaleToBounds(w: number, h: number): { w: number; h: number } {
  const scale = Math.min(1, PREVIEW_MAX_W / w, PREVIEW_MAX_H / h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function imgTag(src: string, dims: { w: number; h: number } | null): string {
  if (dims) {
    return `<img src="${src}" width="${dims.w}" height="${dims.h}" />`;
  }
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
      const content = readFileSync(filePath, "utf8");
      return ext === ".md" ? content : `\`\`\`${ext.slice(1)}\n${content}\n\`\`\``;
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
    const modified = stat.mtime.toLocaleString();
    return `## ${basename(filePath)}\n\n| | |\n|---|---|\n| **Format** | \`${ext || "unknown"}\` |\n| **Size** | ${sizeKB} KB |\n| **Modified** | ${modified} |\n\n*Press ⌘Y to open with Quick Look, or ⌘O to open with the default app.*`;
  } catch {
    return `## ${basename(filePath)}\n\n*Press ⌘Y to open with Quick Look.*`;
  }
}

async function generateQLThumbnail(filePath: string): Promise<string | null> {
  try {
    mkdirSync(QL_THUMB_DIR, { recursive: true });
    await new Promise<void>((resolve, reject) => {
      execFile("/usr/bin/qlmanage", ["-t", "-s", "800", "-o", QL_THUMB_DIR, filePath], (err) => {
        // qlmanage exits non-zero even on success sometimes; check thumb existence instead
        if (err && !existsSync(join(QL_THUMB_DIR, basename(filePath) + ".png"))) {
          reject(err);
        } else {
          resolve();
        }
      });
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
    await showToast({ style: Toast.Style.Failure, title: "Files no longer exist" });
    return;
  }
  const args = buildCrocArgs("send", existing);
  const toast = await showToast({ style: Toast.Style.Animated, title: "Re-sending…" });
  spawnCrocSend(crocPath, args,
    async (phrase) => {
      await Clipboard.copy(phrase);
      toast.style = Toast.Style.Animated;
      toast.title = "Waiting for receiver";
      toast.message = phrase;
      await addRecord({ type: "send", files: existing, phrase, status: "success" });
    },
    (p) => { toast.message = `${p.percent}%`; },
    async () => { toast.style = Toast.Style.Success; toast.title = "Re-send complete"; },
    async (err) => { toast.style = Toast.Style.Failure; toast.title = "Re-send failed"; toast.message = err.message; }
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
      // Show metadata immediately, then replace with thumbnail when ready
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
            icon={{ source: record.type === "send" ? Icon.Upload : Icon.Download, tintColor: record.type === "send" ? Color.Blue : Color.Green }}
          />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={record.status === "success" ? "Success" : record.status === "failed" ? "Failed" : "Cancelled"}
            icon={{
              source: record.status === "success" ? Icon.CheckCircle : record.status === "failed" ? Icon.XMarkCircle : Icon.MinusCircle,
              tintColor: record.status === "success" ? Color.Green : record.status === "failed" ? Color.Red : Color.SecondaryText,
            }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Code Phrase" text={record.phrase} icon={Icon.Key} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Date" text={new Date(record.timestamp).toLocaleString()} icon={Icon.Clock} />
          {dirPath && (
            <List.Item.Detail.Metadata.Label title="Folder" text={dirPath} icon="📥" />
          )}
          {record.files.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              {record.files.map((f, i) => (
                <List.Item.Detail.Metadata.Label
                  key={i}
                  title={i === 0 ? `File${record.files.length > 1 ? "s" : ""}` : ""}
                  text={basename(f)}
                  icon={existsSync(f) ? Icon.Document : { source: Icon.Document, tintColor: Color.SecondaryText }}
                />
              ))}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function RecordItem({ record, onRemove }: { record: TransferRecord; onRemove: (id: string) => void }) {
  const dirPath = record.files[0] ? dirname(record.files[0]) : null;
  const filesExist = record.files.some((f) => existsSync(f));
  const firstExistingFile = record.files.find((f) => existsSync(f));
  const statusColor =
    record.status === "success" ? Color.Green
    : record.status === "failed" ? Color.Red
    : Color.SecondaryText;

  return (
    <List.Item
      icon={{ source: record.type === "send" ? Icon.Upload : Icon.Download, tintColor: statusColor }}
      title={record.phrase}
      quickLook={firstExistingFile ? { path: firstExistingFile, name: basename(firstExistingFile) } : undefined}
      accessories={[]}
      detail={<RecordDetail record={record} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {firstExistingFile && (
              <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
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
              onAction={async () => { await Clipboard.copy(record.phrase); await showHUD(`Copied: ${record.phrase}`); }}
            />
            <Action
              title="Copy Deep Link"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => { await Clipboard.copy(buildDeepLink(record.phrase)); await showHUD("Deep Link copied!"); }}
            />
            {record.type === "send" && filesExist && (
              <Action
                title="Re-send Files"
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
              onAction={async () => { await onRemove(record.id); await showHUD("Record deleted"); }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function TransferHistory() {
  const { history, isLoading, remove, clear } = useTransferHistory();

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "This will permanently delete all transfer records.",
      primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) { await clear(); await showHUD("History cleared"); }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search by filename or code phrase…"
      actions={
        history.length > 0 ? (
          <ActionPanel>
            <Action title="Clear All History" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleClearAll} />
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
      {history.map((r) => (
        <RecordItem key={r.id} record={r} onRemove={remove} />
      ))}
    </List>
  );
}
