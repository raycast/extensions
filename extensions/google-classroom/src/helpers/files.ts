import { environment } from "@raycast/api";
import { once } from "events";
import { WriteStream, createWriteStream, existsSync } from "fs";
import { mkdir, mkdtemp, readdir, rename, rm, stat } from "fs/promises";
import { homedir } from "os";
import { join, parse } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { ReadableStream as WebReadableStream } from "stream/web";
import { Attachment } from "../api/classroom";
import { getOAuthToken } from "../api/googleAuth";

type ExportFormat = { extension: string; mimeType: string };

const PDF: ExportFormat = { extension: "pdf", mimeType: "application/pdf" };

// Google-native files can't be downloaded as is, they need to be exported
const EXPORT_FORMATS: Record<string, { office: ExportFormat; ai: ExportFormat }> = {
  "application/vnd.google-apps.document": {
    office: { extension: "docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ai: PDF,
  },
  "application/vnd.google-apps.spreadsheet": {
    office: { extension: "xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    // A CSV export only holds the first sheet
    ai: PDF,
  },
  "application/vnd.google-apps.presentation": {
    office: {
      extension: "pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
    ai: PDF,
  },
  "application/vnd.google-apps.drawing": { office: PDF, ai: PDF },
};

const HOUR = 60 * 60 * 1000;
// Nothing received for this long means the download stalled
const IDLE_TIMEOUT = 30_000;

function truncate(text: string, bytes: number) {
  while (Buffer.byteLength(text) > bytes) text = text.slice(0, -1);
  return text;
}

// Makes a name valid on both macOS and Windows, leaving room for a suffix within the 255 bytes file systems allow
function sanitize(name: string) {
  // eslint-disable-next-line no-control-regex
  const safe = truncate(name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_"), 200).replace(/[. ]+$/, "") || "Untitled";
  // Names Windows reserves for devices, whatever their extension
  return /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(safe) ? `_${safe}` : safe;
}

// Returns a path in `dir` that doesn't exist yet, e.g. "Report (1).pdf"
function getAvailablePath(dir: string, name: string, extension?: string) {
  let { name: base, ext } = parse(sanitize(name));
  if (extension) {
    base = ext.toLowerCase() === `.${extension}` ? base : base + ext;
    ext = `.${extension}`;
  }

  let path = join(dir, base + ext);
  for (let i = 1; existsSync(path); i++) {
    path = join(dir, `${base} (${i})${ext}`);
  }
  return path;
}

// Creates a folder that didn't exist yet, e.g. "Essay (1)". Creating it is what claims the name,
// so that downloads running at the same time each get a folder of their own.
async function createFolder(parent: string, name: string) {
  await mkdir(parent, { recursive: true });
  const base = sanitize(name);
  for (let i = 0; ; i++) {
    const dir = join(parent, i ? `${base} (${i})` : base);
    try {
      await mkdir(dir);
      return dir;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

// Files handed over to AI are temporary: the ones of earlier handoffs can go,
// but not those another handoff may still be pasting
async function createAIFolder() {
  const root = join(environment.supportPath, "ai-chat");
  await mkdir(root, { recursive: true });
  for (const name of await readdir(root)) {
    const path = join(root, name);
    const modified = await stat(path).then(
      ({ mtimeMs }) => mtimeMs,
      () => Date.now(),
    );
    if (Date.now() - modified > HOUR) await rm(path, { recursive: true, force: true });
  }
  return mkdtemp(join(root, "handoff-"));
}

async function fetchDrive(path: string, signal: AbortSignal) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${path}`, {
    headers: { Authorization: `Bearer ${await getOAuthToken()}` },
    signal,
  });

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | undefined;
    throw new Error(data?.error?.message ?? `Download failed: ${response.statusText}`);
  }

  return response;
}

export type DownloadOptions = {
  // Folder created in Downloads to hold the files
  folderName: string;
  // Downloads to the extension's support folder instead, exporting Google-native files
  // to formats AI models can read instead of Office formats
  forAI?: boolean;
  onProgress?: (message: string) => void;
  // Cancels the download, keeping the files that were already complete
  signal?: AbortSignal;
};

export type DownloadResult = {
  paths: string[];
  // Names of the Google-native files without a downloadable format (forms, sites, folders…)
  skipped: string[];
  failed: { name: string; message: string }[];
};

// Downloads the Drive attachments to a new folder. One file failing doesn't stop the others.
export async function downloadAttachments(
  attachments: Attachment[],
  options: DownloadOptions,
): Promise<DownloadResult> {
  const result: DownloadResult = { paths: [], skipped: [], failed: [] };
  const files = attachments.filter((attachment) => attachment.driveId);
  if (files.length === 0) return result;

  const dir = options.forAI
    ? await createAIFolder()
    : await createFolder(join(homedir(), "Downloads"), options.folderName);

  for (const [index, { driveId, title }] of files.entries()) {
    if (options.signal?.aborted) break;

    const stalled = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const keepAlive = () => {
      clearTimeout(timer);
      timer = setTimeout(() => stalled.abort(new Error("The download stalled")), IDLE_TIMEOUT);
    };
    const signal = options.signal ? AbortSignal.any([options.signal, stalled.signal]) : stalled.signal;

    let name = title;
    let partial: string | undefined;
    let output: WriteStream | undefined;
    try {
      keepAlive();
      const metadata = await fetchDrive(`${driveId}?fields=name,mimeType&supportsAllDrives=true`, signal);
      const { mimeType, ...file } = (await metadata.json()) as { name: string; mimeType: string };
      name = file.name;
      options.onProgress?.(`${index + 1}/${files.length} - ${name}`);

      const format = EXPORT_FORMATS[mimeType]?.[options.forAI ? "ai" : "office"];
      if (!format && mimeType.startsWith("application/vnd.google-apps.")) {
        result.skipped.push(name);
        continue;
      }

      keepAlive();
      const response = await fetchDrive(
        format
          ? `${driveId}/export?mimeType=${encodeURIComponent(format.mimeType)}`
          : `${driveId}?alt=media&supportsAllDrives=true`,
        signal,
      );
      // An interrupted download must not be left behind under the name of the complete file
      const path = getAvailablePath(dir, name, format?.extension);
      partial = `${path}.part`;
      await pipeline(
        Readable.fromWeb(response.body as WebReadableStream),
        async function* (chunks: AsyncIterable<Buffer>) {
          for await (const chunk of chunks) {
            keepAlive();
            yield chunk;
          }
        },
        (output = createWriteStream(partial)),
        { signal },
      );
      await rename(partial, path);
      result.paths.push(path);
    } catch (error) {
      if (partial) {
        // Windows refuses to delete a file that is still open, and an aborted pipeline rejects before closing it
        if (output && !output.closed) await once(output, "close").catch(() => undefined);
        await rm(partial, { force: true, maxRetries: 3 }).catch(() => undefined);
      }
      if (options.signal?.aborted) break;
      // An aborted pipeline only says it was aborted, the reason holds why
      const cause = stalled.signal.aborted ? stalled.signal.reason : error;
      result.failed.push({ name, message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      clearTimeout(timer);
    }
  }

  if (result.paths.length === 0) await rm(dir, { recursive: true, force: true });
  return result;
}
