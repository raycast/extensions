import { showToast, Toast } from "@raycast/api";
import { existsSync, statSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { describeBleedPt, resolveBleed, type BleedChoice } from "./bleed";
import { convertFile, presetUsesDocumentBleed } from "./illustrator";
import type { Settings } from "./settings";

export { describeChoice, type BleedChoice } from "./bleed";

export type Job = {
  input: string;
  bleed: BleedChoice;
  preset: string;
  multipleArtboards: boolean;
  destination?: string;
};

export type JobResult =
  | { input: string; output: string; bleedPt: number; exact: boolean; source: BleedChoice["mode"] }
  | { input: string; error: string };

export function isAiFile(path: string): boolean {
  return extname(path).toLowerCase() === ".ai";
}

/**
 * Builds the PDF path next to the source (or in the configured output folder),
 * numbering the name rather than clobbering an existing PDF unless asked to.
 */
export function buildOutputPath(input: string, suffix: string, settings: Settings, destination?: string): string {
  const folder = destination ?? settings.destination ?? dirname(input);
  const stem = basename(input, extname(input)) + suffix;

  const candidate = join(folder, `${stem}.pdf`);
  if (settings.overwrite || !existsSync(candidate)) {
    return candidate;
  }
  for (let n = 2; n < 1000; n++) {
    const numbered = join(folder, `${stem} ${n}.pdf`);
    if (!existsSync(numbered)) {
      return numbered;
    }
  }
  return candidate;
}

export async function runJob(job: Job, settings: Settings): Promise<JobResult> {
  try {
    if (!existsSync(job.input) || !statSync(job.input).isFile()) {
      throw new Error("File not found.");
    }
    // Such a preset always takes the document's own bleed. That is exactly right
    // for "from the file" and the only way to a sub-point-accurate bleed, but it
    // silently overrules a custom bleed or no bleed at all.
    const documentBleedPreset = presetUsesDocumentBleed(job.preset);
    if (documentBleedPreset && job.bleed.mode !== "file") {
      throw new Error(
        `The preset "${job.preset}" has "Use Document Bleed Settings" enabled, so it always uses the document's own bleed and ignores this setting. Pick another preset, or set the bleed to From the File.`,
      );
    }

    const { requestPt, actualPt, exact } = resolveBleed(job.input, job.bleed, documentBleedPreset);
    const suffix = actualPt > 0 ? settings.suffixBleed : settings.suffixNoBleed;
    const output = buildOutputPath(job.input, suffix, settings, job.destination);

    await convertFile({
      input: job.input,
      output,
      bleedPt: requestPt,
      preset: job.preset,
      multipleArtboards: job.multipleArtboards,
      timeoutMs: settings.timeoutMs,
    });
    return { input: job.input, output, bleedPt: actualPt, exact, source: job.bleed.mode };
  } catch (error) {
    return { input: job.input, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Runs jobs one at a time — Illustrator handles a single script at a time anyway. */
export async function runJobs(
  jobs: Job[],
  settings: Settings,
  onProgress?: (done: number, total: number, current: string) => void,
): Promise<JobResult[]> {
  const results: JobResult[] = [];
  for (const [index, job] of jobs.entries()) {
    onProgress?.(index, jobs.length, basename(job.input));
    results.push(await runJob(job, settings));
  }
  return results;
}

export function summarize(results: JobResult[]): { succeeded: JobResult[]; failed: (JobResult & { error: string })[] } {
  const failed = results.filter((result): result is JobResult & { error: string } => "error" in result);
  const succeeded = results.filter((result) => !("error" in result));
  return { succeeded, failed };
}

/** Describes the bleed actually applied to a converted file. */
export function describeBleed(result: JobResult): string {
  return "error" in result ? "" : describeBleedPt(result.bleedPt);
}

export async function showSummary(results: JobResult[]) {
  const { succeeded, failed } = summarize(results);

  if (failed.length === 0) {
    const first = succeeded[0];
    await showToast({
      style: Toast.Style.Success,
      title: succeeded.length === 1 ? "PDF created" : `${succeeded.length} PDFs created`,
      message:
        succeeded.length === 1 && "output" in first ? `${basename(first.output)} — ${describeBleed(first)}` : undefined,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title:
      succeeded.length > 0
        ? `${succeeded.length} converted, ${failed.length} failed`
        : failed.length === 1
          ? "Conversion failed"
          : `${failed.length} conversions failed`,
    message: `${basename(failed[0].input)}: ${failed[0].error}`,
  });
}
