import fs from "fs";
import path from "path";
import { SATURN_ROOT } from "./saturn";

/** Written by Saturn on capture hotkey; consumed by the Raycast save command. */
export const CAPTURE_PENDING_FILE = path.join(
  SATURN_ROOT,
  "capture-pending.json",
);

export interface CaptureCandidate {
  type: "link" | "text" | "color" | "file";
  payload: string;
  title?: string;
  sourceApp?: string;
  sourceUrl?: string;
}

export interface PendingCapture {
  version: 1;
  candidate: CaptureCandidate;
  /** Viewport screenshot taken before Raycast opens, when available. */
  previewImagePath?: string;
  capturedAt: string;
}

export function readPendingCapture(): PendingCapture | null {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(CAPTURE_PENDING_FILE, "utf-8"),
    ) as Partial<PendingCapture>;
    if (
      parsed?.version !== 1 ||
      !parsed.candidate ||
      typeof parsed.candidate !== "object" ||
      typeof parsed.candidate.payload !== "string" ||
      !parsed.candidate.payload.trim()
    ) {
      return null;
    }
    return {
      version: 1,
      candidate: {
        type: parsed.candidate.type ?? "link",
        payload: parsed.candidate.payload,
        title:
          typeof parsed.candidate.title === "string"
            ? parsed.candidate.title
            : undefined,
        sourceApp:
          typeof parsed.candidate.sourceApp === "string"
            ? parsed.candidate.sourceApp
            : undefined,
        sourceUrl:
          typeof parsed.candidate.sourceUrl === "string"
            ? parsed.candidate.sourceUrl
            : undefined,
      },
      previewImagePath:
        typeof parsed.previewImagePath === "string"
          ? parsed.previewImagePath
          : undefined,
      capturedAt:
        typeof parsed.capturedAt === "string"
          ? parsed.capturedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearPendingCapture(): void {
  try {
    fs.unlinkSync(CAPTURE_PENDING_FILE);
  } catch {
    // Already gone.
  }
}

export function fileUrlForLocalPath(filePath: string): string {
  return `file://${encodeURI(filePath)}`;
}
