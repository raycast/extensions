import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
  openSync,
  readSync,
  closeSync,
  renameSync,
} from "fs";
import { createHash } from "crypto";
import { execFile, ChildProcess } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { SearchResult } from "./types";
import { formatFileSize, formatRelativeDate } from "./utils";

const IMAGE_TYPES = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "heic",
  "tiff",
  "bmp",
  "ico",
]);
const TEXT_PREVIEW_TYPES = new Set([
  "md",
  "txt",
  "csv",
  "html",
  "xml",
  "json",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "log",
  "sql",
  "sh",
  "zsh",
  "bash",
  "rs",
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "go",
  "rb",
  "java",
  "c",
  "cpp",
  "h",
  "css",
  "scss",
]);
const MAX_PREVIEW_BYTES = 8192;
const MAX_PREVIEW_LINES = 40;
const RENDER_AS_PLAIN = new Set(["txt", "md"]);

function readTextPreview(path: string, ext: string): string {
  try {
    const buf = Buffer.alloc(MAX_PREVIEW_BYTES);
    const fd = openSync(path, "r");
    const bytesRead = readSync(fd, buf, 0, MAX_PREVIEW_BYTES, 0);
    closeSync(fd);
    const raw = buf.slice(0, bytesRead).toString("utf-8");
    const lastNewline = raw.lastIndexOf("\n");
    const text = lastNewline > 0 ? raw.slice(0, lastNewline) : raw;
    const allLines = text.split("\n");
    const truncated =
      allLines.length > MAX_PREVIEW_LINES || bytesRead >= MAX_PREVIEW_BYTES;
    const lines = allLines.slice(0, MAX_PREVIEW_LINES);
    const content = lines.join("\n");
    const truncNote = truncated ? "\n\n---" : "";

    if (RENDER_AS_PLAIN.has(ext)) {
      return content + truncNote;
    }
    if (ext === "csv") {
      const rows = lines.slice(0, 20);
      if (rows.length >= 2) {
        const parsed = rows.map((r) =>
          r.split(",").map((c) => c.trim().replace(/^"|"$/g, "")),
        );
        const maxCols = Math.min(parsed[0].length, 5);
        const trim = (s: string) => (s.length > 20 ? s.slice(0, 18) + ".." : s);
        const header =
          "| " + parsed[0].slice(0, maxCols).map(trim).join(" | ") + " |";
        const sep = "| " + Array(maxCols).fill("---").join(" | ") + " |";
        const body = parsed
          .slice(1)
          .map((r) => "| " + r.slice(0, maxCols).map(trim).join(" | ") + " |")
          .join("\n");
        const extra =
          parsed[0].length > 5
            ? `\n\n*+${parsed[0].length - 5} more columns*`
            : "";
        return header + "\n" + sep + "\n" + body + extra;
      }
    }
    const lang =
      ext === "py"
        ? "python"
        : ext === "rs"
          ? "rust"
          : ext === "js" || ext === "jsx"
            ? "javascript"
            : ext === "ts" || ext === "tsx"
              ? "typescript"
              : ext === "rb"
                ? "ruby"
                : ext === "yml" || ext === "yaml"
                  ? "yaml"
                  : ext;
    return "```" + lang + "\n" + content + "\n```" + truncNote;
  } catch {
    return "";
  }
}

export function ResultDetail({ result }: { result: SearchResult }) {
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let qlChild: ChildProcess | undefined;

    setPreview("");

    if (result.file_type && IMAGE_TYPES.has(result.file_type)) {
      setPreview(
        `![preview](file://${result.path.split("/").map(encodeURIComponent).join("/")}?raycast-height=250)`,
      );
    } else if (result.file_type === "pdf") {
      const hash = createHash("md5").update(result.path).digest("hex");
      const thumbDir = join(tmpdir(), "findr-thumbs");
      const thumbPath = join(thumbDir, `${hash}.png`);

      if (existsSync(thumbPath)) {
        setPreview(`![preview](file://${thumbPath})\n\n`);
      } else {
        const qlOutDir = join(thumbDir, hash);
        mkdirSync(qlOutDir, { recursive: true });
        if (!cancelled) {
          qlChild = execFile(
            "qlmanage",
            ["-t", result.path, "-s", "600", "-o", qlOutDir],
            { timeout: 3000 },
            () => {
              if (cancelled) return;
              try {
                const pngFile = readdirSync(qlOutDir).find((name) =>
                  name.endsWith(".png"),
                );
                if (pngFile) {
                  renameSync(join(qlOutDir, pngFile), thumbPath);
                }
              } catch {
                /* qlmanage may have failed */
              }
              try {
                rmSync(qlOutDir, { recursive: true });
              } catch {
                /* best effort */
              }
              if (existsSync(thumbPath)) {
                setPreview(`![preview](file://${thumbPath})\n\n`);
              }
            },
          );
        }
      }
    } else if (
      result.file_type &&
      TEXT_PREVIEW_TYPES.has(result.file_type) &&
      !result.is_dir
    ) {
      timer = setTimeout(() => {
        if (cancelled) return;
        const text = readTextPreview(result.path, result.file_type!);
        if (text && !cancelled) {
          setPreview(text + "\n\n");
        }
      }, 0);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (qlChild) qlChild.kill();
    };
  }, [result.path, result.file_type, result.is_dir]);

  let markdown = "";
  if (result.content_snippet) {
    const sanitized = result.content_snippet
      .replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, "\\$&")
      .replace(/\n/g, "\n> ");
    markdown += `> ${sanitized}\n\n`;
  }
  markdown += preview;

  return (
    <List.Item.Detail
      markdown={markdown || undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Path" text={result.path} />
          <List.Item.Detail.Metadata.Separator />
          {result.is_dir ? (
            <List.Item.Detail.Metadata.Label title="Type" text="FOLDER" />
          ) : (
            result.file_type && (
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={result.file_type.toUpperCase()}
              />
            )
          )}
          {result.size_bytes && !result.is_dir && (
            <List.Item.Detail.Metadata.Label
              title="Size"
              text={formatFileSize(result.size_bytes)}
            />
          )}
          {result.modified && (
            <List.Item.Detail.Metadata.Label
              title="Modified"
              text={formatRelativeDate(result.modified)}
            />
          )}
          {result.interactions > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Interactions"
              text={String(result.interactions)}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
