import type { ReactElement } from "react";
import { inputLabel } from "../lib/classify";
import { runInBackground } from "./background";
import { type ResultProps, ResultView } from "./result";

export interface StartRun extends ResultProps {
  /** Run detached and save to `outputFolder`; a preview (dryRun) never does. */
  background: boolean;
  outputFolder?: string;
}

/**
 * The one way a view starts a run. A background run is counted only once it has started; a
 * foreground run pushes the Result before it is counted, so a count that fails to save never
 * holds up ↵. A preview calls no model, so it isn't counted.
 */
export async function startRun(push: (el: ReactElement) => void, given: StartRun, onRun: () => void): Promise<void> {
  // Here, so every way into a run labels a link with what it is, not only the views that remember to.
  const r = { ...given, inputLabel: inputLabel(given.inputLabel, given.spec.input) };
  if (r.background && !r.spec.dryRun) {
    if (await runInBackground(r.fabricPath, r.spec, r.inputLabel, r.outputFolder)) onRun();
    return;
  }
  push(<ResultView {...r} />);
  if (!r.spec.dryRun) onRun();
}
