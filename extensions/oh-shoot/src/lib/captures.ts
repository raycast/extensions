import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getCapturesDir } from "./paths";
import type { IndexRow } from "./index-db";

/** Shape of the `{UUID}.json` sidecar written by oh-shoot next to each capture. */
export interface CaptureSidecar {
    id: string;
    timestamp: string; // ISO8601
    width: number;
    height: number;
    deviceID: string;
    lastModified: string; // ISO8601
    schemaVersion: number;
}

/** A search result enriched with sidecar metadata and resolved file paths. */
export interface Capture {
    id: string;
    content: string;
    sidecar: CaptureSidecar;
    pngPath: string;
    thumbPath: string;
    /** Epoch milliseconds parsed from the sidecar timestamp, for sorting. */
    timestampMs: number;
}

function capturePaths(dir: string, id: string) {
    return {
        png: join(dir, `${id}.png`),
        thumb: join(dir, `${id}_thumb.png`),
        sidecar: join(dir, `${id}.json`),
    };
}

/**
 * Narrows an arbitrary parsed JSON value to a {@link CaptureSidecar} by checking
 * the load-bearing fields actually consumed by the UI / sorter. Sidecars
 * failing this check are treated as invalid — same as a missing file.
 */
function isCaptureSidecar(value: unknown): value is CaptureSidecar {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const v = value as Record<string, unknown>;
    return (
        typeof v.id === "string" &&
        typeof v.timestamp === "string" &&
        typeof v.width === "number" &&
        typeof v.height === "number"
    );
}

/**
 * Reads and parses the sidecar JSON for a capture id. Returns `undefined` when
 * the sidecar is missing, unparseable, or doesn't match the expected shape —
 * such captures are invalid/not visible.
 */
function readSidecar(sidecarPath: string): CaptureSidecar | undefined {
    if (!existsSync(sidecarPath)) {
        return undefined;
    }
    try {
        const parsed: unknown = JSON.parse(readFileSync(sidecarPath, "utf8"));
        return isCaptureSidecar(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Turns raw OCR index rows into fully-resolved captures, dropping any row whose
 * `{UUID}.json` sidecar is missing (only sidecar-backed captures are valid), and
 * sorts the surviving captures NEWEST-FIRST by sidecar timestamp.
 */
export function toCaptures(rows: IndexRow[]): Capture[] {
    const dir = getCapturesDir();
    const captures: Capture[] = [];

    for (const row of rows) {
        const paths = capturePaths(dir, row.id);
        const sidecar = readSidecar(paths.sidecar);
        if (!sidecar) {
            // No sidecar -> capture is not valid/visible. Skip it.
            continue;
        }

        const parsedMs = Date.parse(sidecar.timestamp);
        const timestampMs = Number.isNaN(parsedMs) ? 0 : parsedMs;

        captures.push({
            id: row.id,
            content: row.content,
            sidecar,
            pngPath: paths.png,
            thumbPath: paths.thumb,
            timestampMs,
        });
    }

    captures.sort((a, b) => b.timestampMs - a.timestampMs);
    return captures;
}

/** Formats a sidecar timestamp into a human-friendly local string. */
export function formatTimestamp(iso: string): string {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) {
        return iso;
    }
    return new Date(ms).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
