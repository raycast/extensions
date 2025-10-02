// src/screenshot.ts

/**
 * Screenshot capture utilities.
 *
 * @packageDocumentation
 */

import { environment } from "@raycast/api"
import { execFile } from "child_process"
import { mkdtemp } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { promisify } from "util"
import type { CaptureOptions, CaptureResult } from "./types"

const pexecFile = promisify(execFile)

/**
 * Capture an interactive screenshot using the macOS `screencapture` utility.
 *
 * @remarks
 * This invokes the native `screencapture` binary with interactive selection (`-i`).
 * We prefer saving to a temporary file inside Raycast's support directory, which is not synced or exposed to the user.
 *
 * @important Raycast does not provide a first-party screenshot API at this time; using `screencapture` is the most
 * robust approach. If Apple changes CLI flags, update `flags` accordingly. Keep this in sync with tests.
 *
 * @param options Options that control capture behavior.
 * @returns An object containing the absolute file path and format of the captured image.
 */
export async function captureInteractiveScreenshot(options: CaptureOptions = {}): Promise<CaptureResult> {
  const includeCursor = options.includeCursor ?? false
  const format: "png" = options.format ?? "png"

  // Ensure a temp folder for this session. Fall back to OS tmp if supportPath is unavailable for any reason.
  const baseTempDir = environment.supportPath || (await mkdtemp(join(tmpdir(), "raycast-")))
  const outFile = join(baseTempDir, `screenshot-${Date.now()}.${format}`)

  const flags = ["-i", "-x"] // interactive + no sound (quieter UX)
  if (includeCursor) flags.push("-C") // include cursor in capture

  // Save to file
  flags.push(outFile)

  // Prefer absolute path to avoid PATH issues in sandboxed environments.
  const candidates = ["/usr/sbin/screencapture", "screencapture"]
  let lastError: unknown
  for (const bin of candidates) {
    try {
      await pexecFile(bin, flags)
      lastError = undefined
      break
    } catch (e) {
      lastError = e
    }
  }
  if (lastError) {
    // When selection is cancelled, screencapture exits non-zero.
    throw new Error(`Screenshot cancelled or failed: ${String((lastError as Error).message || lastError)}`)
  }

  return { filePath: outFile, format }
}

/**
 * Utility: Convert a file buffer to a data URL string suitable for providers that accept base64 input.
 *
 * @param buffer File contents as a Buffer.
 * @param mime The mime-type, e.g. "image/png".
 * @returns data URL string.
 */
export function toDataUrl(buffer: Buffer, mime: string): string {
  const b64 = buffer.toString("base64")
  return `data:${mime};base64,${b64}`
}
