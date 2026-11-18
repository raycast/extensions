/**
 * Adding a tap, as one confirmed run: `brew tap`, a read-back of what brew
 * found, then `brew trust` only if the read-back shows packages.
 */

import { actionsLogger } from "../logger";
import { execBrew } from "./commands";
import { confirmAndRun, SKIPPED } from "./confirmAndRun";
import { contentsOfTap, contentsText, isEmptyTap } from "./tapPreflight";
import { brewFetchTap, brewTapCommand, type TapTarget } from "./taps";

/**
 * Add a tap, trusting it unless `trust` is false, then read back what brew
 * found. An empty tap is kept (the user may want it, and removing it is one
 * action away) but never trusted: trusting nothing only pre-approves whatever
 * lands in it later.
 *
 * The read-back runs inside the same `confirmAndRun`, between the tap and the
 * trust step, rather than after it: with Close After Action on, the run ends
 * in a HUD that closes Raycast, and work queued after it may never happen.
 */
export async function addTap(
  target: TapTarget,
  opts: { trust: boolean; title: string; message: string; confirmTitle: string },
  onDone: () => void,
) {
  const tapCommand = brewTapCommand("tap", target.tap, ...(target.url ? [target.url] : []));
  const trustCommand = brewTapCommand("trust", "--tap", target.tap);
  // Read at the end of the run, so the read-back below can still change it.
  const labels = {
    progress: `Adding ${target.tap}`,
    success: `Added ${target.tap}`,
    failure: `Failed to add ${target.tap}`,
  };
  // Trust only what the read-back shows has something in it. An empty tap, or
  // one whose read-back failed, is added and left untrusted: the section
  // offers Trust Tap once it lists packages.
  let hasPackages = false;
  let started = false;
  const stopIfCanceled = (signal: AbortSignal | undefined) => {
    if (signal?.aborted) throw new Error("Canceled");
  };
  await confirmAndRun(opts.trust ? [tapCommand, trustCommand] : [tapCommand], {
    beforeRun: async () => (started = true),
    title: opts.title,
    message: opts.message,
    confirmTitle: opts.confirmTitle,
    showCommands: false,
    stepNoun: "step",
    stepLabels: ["Adding the tap", "Trusting the tap"],
    labels,
    run: async (command, signal) => {
      if (command === trustCommand && !hasPackages) {
        stopIfCanceled(signal);
        actionsLogger.log("Skipped trusting a tap with no packages found", { tap: target.tap });
        return SKIPPED;
      }
      await execBrew(command, { signal, raw: true });
      if (command !== tapCommand) return;
      // A failed read never fails the add; it only withholds trust.
      const tap = await brewFetchTap(target.tap, signal).catch(() => undefined);
      stopIfCanceled(signal);
      if (!tap) {
        if (opts.trust) labels.success = `Added ${target.tap} without trusting it`;
        return;
      }
      const contents = contentsOfTap(tap);
      hasPackages = !isEmptyTap(contents);
      labels.success = hasPackages
        ? `Added ${target.tap}: ${contentsText(contents)}`
        : `No packages found in ${target.tap}`;
    },
  });
  // Refresh after any attempt: the tap can be added although trusting it then fails.
  if (started) onDone();
}
