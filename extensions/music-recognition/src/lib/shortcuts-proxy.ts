import { Clipboard, environment } from "@raycast/api";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SHORTCUT_NAME = "RaycastShazam-v1.1";

const BUNDLED_SHORTCUT_FILENAME = "RaycastShazam-v1.1.shortcut";

export type ShortcutProxySuccess = {
  status: "ok";
  title: string;
  artist?: string;
  album?: string;
  artworkBase64?: string;
  artworkMimeType?: string;
  artworkPath?: string;
  appleMusicUrl?: string;
  artworkUrl?: string;
  shazamUrl?: string;
};

type LegacyStatuslessPayload = {
  title?: string;
  artist?: string;
  album?: string;
  artworkBase64?: string;
  artworkMimeType?: string;
  url?: string;
  appleMusicUrl?: string;
  artworkUrl?: string;
  shazamUrl?: string;
};

export type ShortcutProxyNoMatch = {
  status: "no_match";
  message?: string;
};

export type ShortcutProxyError = {
  status: "error";
  message: string;
};

export type ShortcutProxyPayload = ShortcutProxySuccess | ShortcutProxyNoMatch | ShortcutProxyError;

export type ShortcutRunResult =
  | { kind: "match"; payload: ShortcutProxySuccess }
  | { kind: "no_match"; message?: string }
  | { kind: "error"; message: string; stderr?: string };

function spawnAndCapture(command: string, args: string[], options?: { timeoutMs?: number }) {
  return new Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer =
      options?.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
          }, options.timeoutMs)
        : null;

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function getBundledShortcutPath() {
  const filePath = path.join(environment.assetsPath, BUNDLED_SHORTCUT_FILENAME);
  return (await fileExists(filePath)) ? filePath : undefined;
}

export async function listInstalledShortcuts() {
  const result = await spawnAndCapture("shortcuts", ["list"]);
  if (result.code !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || "Failed to list shortcuts.";
    throw new Error(message);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function isProxyShortcutInstalled() {
  const shortcuts = await listInstalledShortcuts();
  return shortcuts.some((name) => name === SHORTCUT_NAME);
}

// The bundled shortcut builds its JSON by substituting values into a text template without escaping them, so a title
// like `Happy (From "Despicable Me 2")` yields invalid JSON. Recover the fields from the known template layout.
const TEMPLATE_PAYLOAD_PATTERN = new RegExp(
  [
    '^\\s*\\{\\s*"title"\\s*:\\s*"([\\s\\S]*?)"\\s*,',
    '\\s*"artist"\\s*:\\s*"([\\s\\S]*?)"\\s*,',
    '\\s*"url"\\s*:\\s*"([\\s\\S]*?)"\\s*,',
    '\\s*"artworkBase64"\\s*:\\s*"([\\s\\S]*?)"\\s*,',
    '\\s*"artworkMimeType"\\s*:\\s*"([\\s\\S]*?)"\\s*\\}\\s*$',
  ].join(""),
);

function parseLooseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = TEMPLATE_PAYLOAD_PATTERN.exec(text);
    if (!match) {
      throw new Error("Not valid JSON");
    }
    const [, title, artist, url, artworkBase64, artworkMimeType] = match;
    return { title, artist, url, artworkBase64, artworkMimeType };
  }
}

function parsePayload(text: string): ShortcutProxyPayload | null {
  try {
    const parsed = parseLooseJson(text) as Partial<ShortcutProxyPayload> & LegacyStatuslessPayload;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.status === "string" && parsed.status === "ok" && typeof parsed.title === "string") {
      return {
        ...parsed,
        ...(typeof parsed.artworkBase64 === "string" && parsed.artworkBase64.trim()
          ? { artworkBase64: parsed.artworkBase64.trim() }
          : {}),
        ...(typeof parsed.artworkMimeType === "string" && parsed.artworkMimeType.trim()
          ? { artworkMimeType: parsed.artworkMimeType.trim() }
          : {}),
      } as ShortcutProxySuccess;
    }
    if (typeof parsed.status === "string" && parsed.status === "no_match") {
      return parsed as ShortcutProxyNoMatch;
    }
    if (typeof parsed.status === "string" && parsed.status === "error" && typeof parsed.message === "string") {
      return parsed as ShortcutProxyError;
    }

    // Accept the user's current shortcut output format:
    // {"title":"...","artist":"...","url":"..."} (no "status" field)
    if (typeof parsed.title === "string" || typeof parsed.artist === "string") {
      const title = (parsed.title ?? "").trim();
      const artist = typeof parsed.artist === "string" ? parsed.artist.trim() : undefined;
      const url = typeof parsed.url === "string" ? parsed.url.trim() : undefined;
      const shazamUrl = typeof parsed.shazamUrl === "string" ? parsed.shazamUrl.trim() : undefined;
      const appleMusicUrl = typeof parsed.appleMusicUrl === "string" ? parsed.appleMusicUrl.trim() : undefined;
      const artworkUrl = typeof parsed.artworkUrl === "string" ? parsed.artworkUrl.trim() : undefined;
      const artworkBase64 = typeof parsed.artworkBase64 === "string" ? parsed.artworkBase64.trim() : undefined;
      const artworkMimeType = typeof parsed.artworkMimeType === "string" ? parsed.artworkMimeType.trim() : undefined;

      if (!title && !artist) {
        return { status: "no_match", message: "No song recognized" };
      }

      return {
        status: "ok",
        title: title || "Unknown Title",
        ...(artist ? { artist } : {}),
        ...(typeof parsed.album === "string" && parsed.album.trim() ? { album: parsed.album.trim() } : {}),
        ...(appleMusicUrl ? { appleMusicUrl } : {}),
        ...(artworkBase64 ? { artworkBase64 } : {}),
        ...(artworkMimeType ? { artworkMimeType } : {}),
        ...(artworkUrl ? { artworkUrl } : {}),
        ...(shazamUrl || url ? { shazamUrl: shazamUrl || url } : {}),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function extensionForMimeType(mimeType?: string) {
  switch (mimeType?.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "image/png":
    default:
      return "png";
  }
}

async function writeArtworkFromBase64(payload: ShortcutProxySuccess) {
  if (!payload.artworkBase64) {
    return payload;
  }

  const base64 = payload.artworkBase64.replace(/\s+/g, "");
  let buffer: Buffer;

  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return payload;
  }

  if (buffer.length === 0) {
    return payload;
  }

  const artworkDirectory = path.join(environment.supportPath, "artwork-cache");
  await fs.mkdir(artworkDirectory, { recursive: true });

  const extension = extensionForMimeType(payload.artworkMimeType);
  const filename = `${crypto.createHash("sha256").update(buffer).digest("hex")}.${extension}`;
  const artworkPath = path.join(artworkDirectory, filename);

  if (!(await fileExists(artworkPath))) {
    await fs.writeFile(artworkPath, buffer);
  }

  return {
    ...payload,
    artworkPath,
  } satisfies ShortcutProxySuccess;
}

const CLIPBOARD_SETTLE_TIMEOUT_MS = 4_000;
const CLIPBOARD_POLL_INTERVAL_MS = 250;

// Fallback for shortcuts that only write the Clipboard. Waits for Raycast to notice the change, and follows its
// large-text placeholder to the file that holds the full text.
async function readShortcutClipboard(previousClipboard: string | undefined) {
  const deadline = Date.now() + CLIPBOARD_SETTLE_TIMEOUT_MS;
  let content = await Clipboard.read();

  while (content.text === previousClipboard && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, CLIPBOARD_POLL_INTERVAL_MS));
    content = await Clipboard.read();
  }

  if (content.file && /\.(txt|json)$/i.test(content.file) && parsePayload(content.text) === null) {
    try {
      // Raycast documents a plain path here, but tolerate a file:// URI too.
      const filePath = content.file.startsWith("file://") ? fileURLToPath(content.file) : content.file;
      return await fs.readFile(filePath, "utf8");
    } catch {
      // Fall through to the plain text.
    }
  }

  return content.text;
}

export async function runProxyShortcut(options?: { timeoutMs?: number; onStatus?: (message: string) => void }) {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  options?.onStatus?.("Launching Shortcuts…");

  const previousClipboard = await Clipboard.readText();
  const run = await spawnAndCapture("shortcuts", ["run", SHORTCUT_NAME], { timeoutMs });

  if (run.timedOut) {
    return {
      kind: "error",
      message: "The shortcut timed out before returning a result.",
      stderr: run.stderr.trim() || undefined,
    } satisfies ShortcutRunResult;
  }

  if (run.code !== 0) {
    const stderr = run.stderr.trim() || undefined;
    const lowerError = `${run.stderr}\n${run.stdout}`.toLowerCase();
    if (lowerError.includes("not recognised") || lowerError.includes("not recognized")) {
      return { kind: "no_match", message: "No song recognized." } satisfies ShortcutRunResult;
    }
    const message = stderr || run.stdout.trim() || "Failed to run the Shortcuts proxy.";
    return { kind: "error", message, stderr } satisfies ShortcutRunResult;
  }

  // The shortcut ends with an "Output" action that returns the same JSON it copies, so prefer stdout. Reading the
  // Clipboard is unreliable for this payload: it embeds the artwork (about 1 MB), Raycast lags behind the real
  // clipboard by over a second, and Raycast hands large text back as a `file-<hash>.txt` placeholder.
  let payload = parsePayload(run.stdout.trim());

  if (!payload) {
    options?.onStatus?.("Reading result from Clipboard…");
    const clipboardText = await readShortcutClipboard(previousClipboard);
    if (!clipboardText) {
      return {
        kind: "error",
        message: "The shortcut completed but did not put any text in the Clipboard.",
      } satisfies ShortcutRunResult;
    }

    payload = parsePayload(clipboardText);
    if (!payload) {
      const sameClipboard = previousClipboard === clipboardText;
      return {
        kind: "error",
        message: sameClipboard
          ? "The shortcut did not write the expected JSON payload to the Clipboard."
          : "Clipboard content is not valid proxy JSON. Check your shortcut output format.",
      } satisfies ShortcutRunResult;
    }
  }

  if (payload.status === "ok") {
    options?.onStatus?.("Preparing artwork…");
    return { kind: "match", payload: await writeArtworkFromBase64(payload) } satisfies ShortcutRunResult;
  }
  if (payload.status === "no_match") {
    return { kind: "no_match", message: payload.message } satisfies ShortcutRunResult;
  }
  return { kind: "error", message: payload.message } satisfies ShortcutRunResult;
}

export async function openShortcutFile(filePath: string) {
  const result = await spawnAndCapture("open", [filePath]);
  if (result.code !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || `Failed to open ${path.basename(filePath)}.`;
    throw new Error(message);
  }
}

export async function openShortcutsApp() {
  const result = await spawnAndCapture("open", ["-a", "Shortcuts"]);
  if (result.code !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || "Failed to open Shortcuts.app.";
    throw new Error(message);
  }
}
