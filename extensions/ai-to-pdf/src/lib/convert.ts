import { existsSync, statSync, unlinkSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { detectArtboardSize, readExportedBoxes } from "./ai-file";
import { describeBleedPt, resolveBleed, type BleedChoice } from "./bleed";
import { convertFile, presetUsesDocumentBleed } from "./illustrator";
import type { Settings } from "./settings";

export { describeChoice, type BleedChoice } from "./bleed";

export type Job = {
  input: string;
  bleed: BleedChoice;
  preset: string;
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

  if (settings.overwrite || !existsSync(join(folder, `${stem}.pdf`))) {
    return join(folder, `${stem}.pdf`);
  }
  for (let n = 2; n < 1000; n++) {
    const numbered = join(folder, `${stem} ${n}.pdf`);
    if (!existsSync(numbered)) {
      return numbered;
    }
  }
  return join(folder, `${stem}.pdf`);
}

/**
 * Checks the PDF really came out with the bleed that was asked for. Illustrator's
 * current settings — the option that applies no preset — can carry "Use Document
 * Bleed Settings" without any way to read that beforehand, and a wrong bleed is
 * not something a print file should be trusted to have silently.
 */
function verifyBleed(
  input: string,
  output: string,
  expectedPt: number,
  preset: string,
  artboardSize: [number, number] | undefined,
): void {
  const { bleed: produced, mediaSize } = readExportedBoxes(output);

  if (produced) {
    settle(output, produced.maxPt, expectedPt, 0.5);
    return;
  }

  // Not every PDF setting writes a TrimBox and a BleedBox. The sheet is still the
  // artboard plus the bleed on either side — printer's marks are forced off — so
  // the MediaBox says what the bleed came out as. Illustrator reports the artboard
  // itself, whether or not the file is PDF-compatible; the file's own PDF part
  // stands in for a document with several artboards, where Illustrator does not.
  const artboard = artboardSize ?? detectArtboardSize(input);
  if (mediaSize && artboard) {
    settle(output, sheetBleedPt(mediaSize, artboard), expectedPt, 1);
    return;
  }

  // Nothing left to measure with — a document of several artboards saved without
  // PDF compatibility, exported by settings that write no page boxes. A named
  // preset is vetted through its .joboptions beforehand and exports the bleed it
  // was handed, so there is nothing to check. Illustrator's current settings are
  // the one route to an override nobody can see coming, and an unmeasured print
  // file is not something to report as done. The PDF itself is left alone: it may
  // be perfectly good, and that is for the person who asked for it to decide.
  if (!preset) {
    throw new Error(
      `${basename(output)} was written, but its bleed could not be measured, so it is not certain it has ${describeBleedPt(expectedPt)}. ` +
        `Pick an explicit PDF preset instead of Illustrator's current settings.`,
    );
  }
}

/** Accepts a measured bleed, or removes the PDF and says what it came out as. */
function settle(output: string, producedPt: number, expectedPt: number, tolerancePt: number): void {
  if (Math.abs(producedPt - expectedPt) <= tolerancePt) {
    return;
  }
  // A print file with the wrong bleed is worse than no file, so it does not get to
  // sit on disk looking finished.
  try {
    unlinkSync(output);
  } catch {
    // Leaving it is still better than failing the conversion for a second reason.
  }
  throw new Error(
    `The PDF came out with ${describeBleedPt(producedPt)} instead of ${describeBleedPt(expectedPt)}. ` +
      `The PDF settings in use override the bleed — pick an explicit PDF preset instead of Illustrator's current settings.`,
  );
}

/**
 * The bleed the exported sheet works out at: half of what it is wider than the
 * artboard. Edges are paired by size rather than by order, so a page Illustrator
 * happens to write rotated does not read as a wrong bleed.
 */
function sheetBleedPt(mediaSize: [number, number], artboard: [number, number]): number {
  const sheet = [...mediaSize].sort((a, b) => a - b);
  const trim = [...artboard].sort((a, b) => a - b);
  return Math.max(0, ...sheet.map((edge, index) => (edge - trim[index]) / 2));
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

    const { artboardSize } = await convertFile({
      input: job.input,
      output,
      bleedPt: requestPt,
      preset: job.preset,
      timeoutMs: settings.timeoutMs,
    });

    if (!existsSync(output)) {
      throw new Error("Illustrator reported success but no PDF was written.");
    }
    verifyBleed(job.input, output, actualPt, job.preset, artboardSize);
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
