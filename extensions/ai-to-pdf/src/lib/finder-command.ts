import { getSelectedFinderItems, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { basename } from "path";
import {
  describeBleed,
  describeChoice,
  isAiFile,
  runJobs,
  summarize,
  type BleedChoice,
  type Job,
  type JobResult,
} from "./convert";
import { getSettings } from "./settings";

/** Shared body of the no-view commands that act on the current Finder selection. */
export async function convertFinderSelection(bleed: BleedChoice) {
  const settings = getSettings();

  let selection: string[];
  try {
    selection = (await getSelectedFinderItems()).map((item) => item.path);
  } catch {
    await showHUD("Select one or more .ai files in Finder first");
    return;
  }

  const files = selection.filter(isAiFile);
  if (files.length === 0) {
    await showHUD(
      selection.length > 0
        ? "The Finder selection contains no .ai files"
        : "Select one or more .ai files in Finder first",
    );
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: files.length === 1 ? `Converting ${basename(files[0])}` : `Converting ${files.length} files`,
    message: describeChoice(bleed),
  });

  const jobs: Job[] = files.map((input) => ({
    input,
    bleed,
    preset: settings.pdfPreset,
  }));

  const results = await runJobs(jobs, settings, (done, total, current) => {
    if (total > 1) {
      toast.title = `Converting ${done + 1}/${total}`;
      toast.message = current;
    }
  });

  await toast.hide();
  await showSummary(results);

  const { succeeded, failed } = summarize(results);
  if (settings.revealInFinder && failed.length === 0 && succeeded.length > 0 && "output" in succeeded[0]) {
    await showInFinder(succeeded[0].output);
  }
}

/** Reports the outcome of a Finder-selection run as a toast. */
async function showSummary(results: JobResult[]) {
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
