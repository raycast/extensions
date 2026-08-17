import { getSelectedFinderItems, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { basename } from "path";
import { describeChoice, isAiFile, runJobs, showSummary, summarize, type BleedChoice, type Job } from "./convert";
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
    multipleArtboards: false,
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
