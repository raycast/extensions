import { environment, showHUD, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { join } from "node:path";
import type { RunSpec } from "../lib/argv";
import { startBackground } from "../lib/background";
import { inputSubject, outputFileName, runLabel } from "../lib/output";
import { ANSWER_REFUSED, errorText, PATTERNS_ROOT } from "./deliver";

export const RUNS_DIR = join(environment.supportPath, "runs");
const WRAPPER = join(environment.assetsPath, "fabric-bg.sh");

/** Starts a detached run and closes Raycast with a HUD. Returns false if it could not start. */
export async function runInBackground(
  fabricPath: string,
  spec: RunSpec,
  inputLabel: string,
  outputFolder: string | undefined,
): Promise<boolean> {
  if (!outputFolder) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Set a Save Folder first",
      message: "Background runs save their answer there.",
      primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
    });
    return false;
  }
  try {
    await startBackground({
      runsDir: RUNS_DIR,
      wrapper: WRAPPER,
      fabricPath,
      spec,
      inputLabel,
      outputFolder,
      finalName: outputFileName(runLabel(spec), inputSubject(spec.input), new Date()),
      patternsRoot: PATTERNS_ROOT,
      refused: ANSWER_REFUSED,
    });
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't start the run", message: errorText(e) });
    return false;
  }
  await showHUD(`Running ${runLabel(spec)} in the background`);
  return true;
}
