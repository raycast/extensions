import fs from "fs";
import path from "path";
import { showToast, Toast, showInFinder, openCommandPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { convertMedia, ConvertOptions } from "./converter";
import { appendHistory } from "./history";
import { formatBytes, formatSavings } from "./format";
import { formatTimeString } from "./time";
import { AllOutputExtension, QualitySettings, TrimOptions, getMediaType, getOutputCategory } from "../types/media";

export type BatchOptions = {
  outputFormat: AllOutputExtension;
  quality: QualitySettings;
  outputDir?: string;
  stripMetadata?: boolean;
  trim?: TrimOptions;
  /** When true, individual video conversions show live progress in the toast. */
  showProgress?: boolean;
};

export type BatchResult = {
  successes: { input: string; output: string; inputBytes: number; outputBytes: number }[];
  failures: { input: string; error: string }[];
};

function safeStatSize(p: string): number {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

/**
 * Orchestrates converting an array of files with shared settings. Handles:
 *  - Animated progress toast (with ETA/percent for videos & gifs)
 *  - Size tracking and savings message
 *  - History logging
 *  - Success/failure summary toast
 */
export async function runConversionBatch(files: string[], opts: BatchOptions): Promise<BatchResult> {
  const result: BatchResult = { successes: [], failures: [] };
  if (files.length === 0) return result;

  const outputCategory = getOutputCategory(opts.outputFormat);
  const canShowProgress = opts.showProgress !== false && (outputCategory === "video" || outputCategory === "gif");

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: buildInitialTitle(files.length, outputCategory),
  });

  for (let i = 0; i < files.length; i++) {
    const input = files[i];
    const position = `${i + 1}/${files.length}`;
    toast.title = `Converting ${position}…`;
    toast.message = path.basename(input);

    const started = Date.now();
    const inputBytes = safeStatSize(input);

    try {
      const convertOpts: ConvertOptions = {
        outputDir: opts.outputDir,
        stripMetadata: opts.stripMetadata,
        trim: opts.trim,
      };

      if (canShowProgress) {
        convertOpts.onProgress = (p) => {
          const pct = Math.floor(p.percent);
          const eta = p.etaSec !== undefined ? ` · ETA ${formatTimeString(p.etaSec)}` : "";
          toast.title = `Converting ${position} · ${pct}%${eta}`;
        };
      }

      const output = await convertMedia(input, opts.outputFormat, opts.quality, convertOpts);
      const outputBytes = safeStatSize(output);
      result.successes.push({ input, output, inputBytes, outputBytes });

      // Log to history (non-blocking failures here shouldn't break the batch)
      try {
        const mediaType = outputCategory === "gif" ? "gif" : (getMediaType(path.extname(input)) ?? "video");
        await appendHistory({
          inputs: [input],
          outputs: [output],
          outputFormat: opts.outputFormat,
          quality: opts.quality,
          mediaType,
          trim: opts.trim,
          stripMetadata: opts.stripMetadata,
          outputDir: opts.outputDir,
          durationMs: Date.now() - started,
          inputBytes,
          outputBytes,
        });
      } catch (historyErr) {
        console.warn("Failed to write history entry:", historyErr);
      }
    } catch (error) {
      const errorMessage = String(error);
      result.failures.push({ input, error: errorMessage });
      console.error(`Conversion failed for ${input}:`, errorMessage);

      if (errorMessage.includes("FFmpeg is not installed or configured")) {
        await toast.hide();
        showFailureToast(new Error("FFmpeg needs to be configured to convert files"), {
          title: "FFmpeg not found",
          primaryAction: {
            title: "Configure FFmpeg",
            onAction: () => openCommandPreferences(),
          },
        });
        return result;
      }
    }
  }

  await toast.hide();
  await presentSummary(result);
  return result;
}

function buildInitialTitle(count: number, category: "video" | "audio" | "image" | "gif"): string {
  const suffix = count > 1 ? "s" : "";
  const noun = category === "gif" ? "GIF" : category;
  return `Converting ${count} ${noun}${suffix}…`;
}

async function presentSummary(result: BatchResult): Promise<void> {
  const okCount = result.successes.length;
  const failCount = result.failures.length;
  const totalIn = result.successes.reduce((sum, s) => sum + s.inputBytes, 0);
  const totalOut = result.successes.reduce((sum, s) => sum + s.outputBytes, 0);

  if (okCount === 0 && failCount > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: result.failures[0]?.error ?? "Unknown error",
    });
    return;
  }

  const savingsLabel = totalIn > 0 ? formatSavings(totalIn, totalOut) : formatBytes(totalOut);
  const titleBase = okCount === 1 ? "File converted successfully!" : `${okCount} files converted`;
  const title = failCount > 0 ? `${titleBase} (${failCount} failed)` : titleBase;
  const singleOutput = okCount === 1 ? result.successes[0].output : null;
  const message = singleOutput ? `${path.basename(singleOutput)} · ${savingsLabel}` : savingsLabel;

  await showToast({
    style: Toast.Style.Success,
    title,
    message,
    primaryAction: singleOutput
      ? {
          title: "Open File",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => showInFinder(singleOutput),
        }
      : undefined,
  });
}
