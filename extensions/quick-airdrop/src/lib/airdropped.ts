import { execFile } from "child_process";
import { promises as fs } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const DOWNLOADS_DIR = join(homedir(), "Downloads");

const QUARANTINE_ATTRIBUTE = "com.apple.quarantine";
// sharingd is the daemon that writes AirDrop-received files, so its name in the
// quarantine attribute is the only reliable marker of an AirDrop transfer.
const AIRDROP_QUARANTINE_AGENT = "sharingd";
// Only the newest entries (by local creation time) are worth an xattr lookup.
const SCAN_LIMIT = 500;
// Keep each xattr invocation well below ARG_MAX.
const XATTR_CHUNK_SIZE = 250;
// Files of a single multi-file transfer land within a couple of seconds.
const TRANSFER_WINDOW_MS = 3000;

export interface AirDroppedFile {
  path: string;
  name: string;
  receivedAt: Date;
}

interface Candidate {
  path: string;
  birthtimeMs: number;
}

async function listCandidates(directory: string): Promise<Candidate[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const stats = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const path = join(directory, entry.name);
        try {
          const stat = await fs.stat(path);
          // birthtime is when sharingd created the local file; mtime is
          // sender-controlled and can predate the transfer by years.
          return { path, birthtimeMs: stat.birthtimeMs };
        } catch {
          return undefined;
        }
      }),
  );

  return stats
    .filter((candidate): candidate is Candidate => candidate !== undefined)
    .sort((a, b) => b.birthtimeMs - a.birthtimeMs)
    .slice(0, SCAN_LIMIT);
}

async function readQuarantineValues(paths: string[]): Promise<Map<string, string>> {
  const values = new Map<string, string>();
  if (paths.length === 0) {
    return values;
  }

  const chunks: string[][] = [];
  for (let index = 0; index < paths.length; index += XATTR_CHUNK_SIZE) {
    chunks.push(paths.slice(index, index + XATTR_CHUNK_SIZE));
  }

  const outputs = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const { stdout } = await execFileAsync("/usr/bin/xattr", ["-p", QUARANTINE_ATTRIBUTE, ...chunk], {
          maxBuffer: 8 * 1024 * 1024,
        });
        return { chunk, stdout };
      } catch (error) {
        // xattr exits non-zero when any path lacks the attribute, which is the
        // normal case here; the paths that do have it are still on stdout.
        const stdout = (error as { stdout?: string }).stdout ?? "";
        return { chunk, stdout };
      }
    }),
  );

  for (const { chunk, stdout } of outputs) {
    if (chunk.length === 1) {
      // With a single path argument xattr prints the bare value.
      const value = stdout.trim();
      if (value.length > 0) {
        values.set(chunk[0], value);
      }
      continue;
    }
    for (const line of stdout.split("\n")) {
      // Split from the right: file names may themselves contain ": ".
      const separator = line.lastIndexOf(": ");
      if (separator === -1) {
        continue;
      }
      const path = line.slice(0, separator);
      const value = line.slice(separator + 2);
      if (chunk.includes(path)) {
        values.set(path, value);
      }
    }
  }

  return values;
}

function parseReceivedAt(quarantineValue: string): Date | undefined {
  // Format: flags;timestamp-hex;agent;event-uuid. Flags mutate when the user
  // opens the file, so only the agent name identifies AirDrop.
  const [, timestampHex, agent] = quarantineValue.split(";");
  if (agent !== AIRDROP_QUARANTINE_AGENT) {
    return undefined;
  }
  const seconds = parseInt(timestampHex, 16);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  return new Date(seconds * 1000);
}

export async function findAirDroppedFiles(): Promise<AirDroppedFile[]> {
  const candidates = await listCandidates(DOWNLOADS_DIR);
  const quarantineValues = await readQuarantineValues(candidates.map((candidate) => candidate.path));

  const files: AirDroppedFile[] = [];
  for (const candidate of candidates) {
    const value = quarantineValues.get(candidate.path);
    if (!value) {
      continue;
    }
    const receivedAt = parseReceivedAt(value);
    if (!receivedAt) {
      continue;
    }
    files.push({
      path: candidate.path,
      name: candidate.path.slice(DOWNLOADS_DIR.length + 1),
      receivedAt,
    });
  }

  return files.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime() || a.name.localeCompare(b.name));
}

/**
 * Returns the files of the most recent transfer. A multi-file AirDrop shares
 * one arrival moment, so everything within a short window of the newest file
 * belongs to the same transfer.
 */
export function latestTransfer(files: AirDroppedFile[]): AirDroppedFile[] {
  if (files.length === 0) {
    return [];
  }
  const newest = files[0].receivedAt.getTime();
  return files.filter((file) => newest - file.receivedAt.getTime() <= TRANSFER_WINDOW_MS);
}

// Arguments: [0] path of a pre-rendered PNG preview ("" for none), [1] the
// paths as shell-escaped plain text, then the file paths to copy. The extra
// flavors ride along with the file URL because clipboard consumers differ:
// image-only readers want raster data, terminals only accept text.
const COPY_FILES_JXA = String.raw`
ObjC.import('AppKit');

function run(argv) {
  var previewPath = argv[0];
  var pathsAsText = argv[1];
  var paths = argv.slice(2);
  if (paths.length === 0) {
    throw new Error('No files to copy');
  }

  var items = $.NSMutableArray.alloc.init;
  for (var i = 0; i < paths.length; i++) {
    var item = $.NSPasteboardItem.alloc.init;
    item.setStringForType($.NSURL.fileURLWithPath(paths[i]).absoluteString, 'public.file-url');
    if (i === 0) {
      item.setStringForType(pathsAsText, 'public.utf8-plain-text');
      if (paths.length === 1 && previewPath !== '') {
        var png = $.NSData.dataWithContentsOfFile(previewPath);
        if (png && !png.isNil() && png.length > 0) {
          item.setDataForType(png, 'public.png');
        }
      }
    }
    items.addObject(item);
  }

  var pasteboard = $.NSPasteboard.generalPasteboard;
  pasteboard.clearContents;
  if (!pasteboard.writeObjects(items)) {
    throw new Error('Could not write the files to the clipboard');
  }

  return 'ok';
}
`;

// Same escaping Finder uses when dragging a file into a terminal.
export function escapePathForTerminal(path: string): string {
  return path.replace(/([^A-Za-z0-9,._+@%/-])/g, "\\$1");
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "heic", "heif", "gif", "tiff", "tif", "webp", "bmp", "avif"]);
// Cap the preview's long edge so the PNG stays a few megabytes even for
// full-resolution photos; the file URL still points at the original.
const PREVIEW_MAX_PIXELS = "2560";

function isImageFile(path: string): boolean {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
}

/**
 * Renders a downscaled PNG preview of an image file into a temp directory.
 * Returns undefined when the file cannot be rendered. sips applies the EXIF
 * orientation, so phone photos paste upright.
 */
async function renderPngPreview(path: string, directory: string): Promise<string | undefined> {
  const preview = join(directory, "preview.png");
  try {
    await execFileAsync("/usr/bin/sips", ["-s", "format", "png", "-Z", PREVIEW_MAX_PIXELS, path, "--out", preview], {
      maxBuffer: 1024 * 1024,
    });
    const stat = await fs.stat(preview);
    return stat.size > 0 ? preview : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Copies one or more files to the clipboard as file URLs, together with the
 * shell-escaped paths as plain text (so terminals can paste them). A single
 * image file additionally gets a downscaled PNG representation, so image-only
 * consumers can paste it too.
 */
export async function copyFilesToClipboard(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    throw new Error("No files to copy");
  }

  const temporaryDirectory = await fs.mkdtemp(join(tmpdir(), "quick-airdrop-copy-"));
  try {
    let preview: string | undefined;
    if (paths.length === 1 && isImageFile(paths[0])) {
      preview = await renderPngPreview(paths[0], temporaryDirectory);
    }
    const pathsAsText = paths.map(escapePathForTerminal).join(" ");
    await execFileAsync(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", COPY_FILES_JXA, "--", preview ?? "", pathsAsText, ...paths],
      { maxBuffer: 1024 * 1024 },
    );
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export function describeTransfer(files: AirDroppedFile[]): string {
  if (files.length === 1) {
    return files[0].name;
  }
  return `${files.length} files`;
}
