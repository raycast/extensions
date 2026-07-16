import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";

/** Matches Reflect Open's `TEXT_CAPTURE_MAX_LENGTH`. */
export const MAX_CAPTURE_LENGTH = 10_000;

export type TextCaptureKind = "append" | "task";

export type CaptureInboxErrorCode = "no-graph" | "invalid-pointer" | "invalid-input" | "io";

export class CaptureInboxError extends Error {
  constructor(
    public readonly code: CaptureInboxErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CaptureInboxError";
  }
}

interface CapturePointer {
  version: number;
  graphRoot: string;
}

interface TextCaptureEnvelope {
  version: 1;
  id: string;
  kind: TextCaptureKind;
  text: string;
  capturedAt: string;
  source: "deep-link";
}

/** The pointer Reflect Open maintains for its active graph. */
export const DEFAULT_CAPTURE_POINTER_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "reflect-open",
  "capture-pointer.json",
);

function parsePointer(raw: string): CapturePointer {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new CaptureInboxError("invalid-pointer", "Reflect Open's graph pointer is malformed.", {
      cause: error,
    });
  }

  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 1 ||
    !("graphRoot" in value) ||
    typeof value.graphRoot !== "string" ||
    value.graphRoot.trim() === "" ||
    !isAbsolute(value.graphRoot)
  ) {
    throw new CaptureInboxError("invalid-pointer", "Reflect Open's graph pointer is not supported.");
  }

  return { version: 1, graphRoot: value.graphRoot };
}

async function captureInboxPath(pointerPath: string): Promise<string> {
  let raw: string;
  try {
    raw = await readFile(pointerPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CaptureInboxError("no-graph", "Open Reflect once and select a graph first.", { cause: error });
    }
    throw new CaptureInboxError("io", "Reflect Open's graph pointer could not be read.", { cause: error });
  }

  const pointer = parsePointer(raw);
  try {
    const graph = await stat(pointer.graphRoot);
    if (!graph.isDirectory()) {
      throw new CaptureInboxError("no-graph", "Reflect Open's selected graph is unavailable.");
    }
  } catch (error) {
    if (error instanceof CaptureInboxError) {
      throw error;
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CaptureInboxError("no-graph", "Reflect Open's selected graph is unavailable.", { cause: error });
    }
    throw new CaptureInboxError("io", "Reflect Open's selected graph could not be checked.", { cause: error });
  }

  const inbox = join(pointer.graphRoot, ".reflect", "inbox");
  try {
    await mkdir(inbox, { recursive: true });
  } catch (error) {
    throw new CaptureInboxError("io", "Reflect Open's capture inbox could not be prepared.", { cause: error });
  }
  return inbox;
}

/**
 * Queue one text capture without launching or focusing Reflect Open.
 *
 * Reflect's watcher drains the inbox while the app is running. When it is
 * closed, the envelope waits safely and is drained on the next launch.
 */
export async function spoolTextCapture(
  text: string,
  kind: TextCaptureKind,
  options: { pointerPath?: string; capturedAt?: Date } = {},
): Promise<void> {
  if (text.trim() === "" || /[\r\n]/.test(text) || text.length > MAX_CAPTURE_LENGTH) {
    throw new CaptureInboxError("invalid-input", "The capture text does not meet Reflect Open's text rules.");
  }

  const inbox = await captureInboxPath(options.pointerPath ?? DEFAULT_CAPTURE_POINTER_PATH);
  const id = randomUUID();
  const envelope: TextCaptureEnvelope = {
    version: 1,
    id,
    kind,
    text,
    capturedAt: (options.capturedAt ?? new Date()).toISOString(),
    // Reflect Open currently accepts `deep-link` and `ios-share` for text
    // captures. This is the same text-envelope route as the deep-link handler,
    // but queued directly so the desktop window never needs to open.
    source: "deep-link",
  };

  const temporaryPath = join(inbox, `.tmp-${id}-${randomUUID()}`);
  const finalPath = join(inbox, `${id}.json`);
  try {
    await writeFile(temporaryPath, JSON.stringify(envelope), { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(temporaryPath, finalPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw new CaptureInboxError("io", "The thought could not be queued for Reflect Open.", { cause: error });
  }
}
