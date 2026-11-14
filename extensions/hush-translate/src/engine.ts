import { environment } from "@raycast/api";
import path from "path";
import { availability, plan, readClipboard as readPasteboard, recognizeImage, translateChunk } from "swift:../swift";

/** Where captured screenshots and clipboard images are kept while history refers to them. */
export const imageDirectory = path.join(environment.supportPath, "images");

export type UnavailableReason = "notEnabled" | "notReady" | "notEligible" | "unknown";
export const UNAVAILABLE_REASONS: readonly string[] = ["notEnabled", "notReady", "notEligible", "unknown"];

export interface Status {
  available: boolean;
  reason?: UnavailableReason;
}

/** Text taken from the clipboard or read out of an image. */
export interface Capture {
  kind: "text" | "image" | "empty";
  text?: string;
  image?: string;
}

export interface Translation {
  from: string;
  to: string;
  text: string;
}

export class EngineError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Swift failures arrive as "code: message"; anything else keeps its own text. */
function engineError(error: unknown): EngineError {
  const text = (error instanceof Error ? error.message : String(error)).trim();
  const match = /^([A-Za-z]+): (.+)$/s.exec(text);
  return match ? new EngineError(match[1], match[2]) : new EngineError("failed", text);
}

async function call<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw engineError(error);
  }
}

export async function getStatus(): Promise<Status> {
  const status = await call(() => availability());
  return { available: status.available, reason: (status.reason ?? undefined) as UnavailableReason | undefined };
}

const asCapture = (capture: { kind: string; text?: string | null; image?: string | null }): Capture => ({
  kind: capture.kind as Capture["kind"],
  text: capture.text ?? undefined,
  image: capture.image ?? undefined,
});

export const readClipboard = async () => asCapture(await call(() => readPasteboard(imageDirectory)));
export const recognizeText = async (image: string) => asCapture(await call(() => recognizeImage(image)));

interface TranslateOptions {
  /** Preferred target language. */
  to: string;
  /** Target to use instead when the text is already in `to`. */
  alt?: string;
  signal?: AbortSignal;
  onStart?: (from: string, to: string) => void;
  onText?: (text: string) => void;
}

/**
 * Translates `text` piece by piece, reporting the growing result after each piece.
 * Aborting stops before the next piece; a piece already running finishes and is dropped.
 */
export async function translate(text: string, options: TranslateOptions): Promise<Translation> {
  const { from, to, chunks } = await call(() => plan(text, options.to, options.alt ?? null));
  options.onStart?.(from, to);

  let done = "";
  for (const chunk of chunks) {
    if (options.signal?.aborted) throw new EngineError("aborted", "The translation was stopped.");
    done += await call(() => translateChunk(chunk, to));
    if (options.signal?.aborted) throw new EngineError("aborted", "The translation was stopped.");
    options.onText?.(done);
  }
  return { from, to, text: done.trim() };
}
