import {
  LaunchType,
  environment,
  getPreferenceValues,
  launchCommand,
  updateCommandMetadata,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { StatusFilter, SummaryMode, loadAgents, summarize } from "./orca.ts";

const execFileAsync = promisify(execFile);

/** Shown when nobody is blocked; searching "orca" matches on it. */
const EXTENSION_NAME = "Orca";

/**
 * Runs in the background so the root search shows a live summary. A view command
 * cannot do this: only no-view and menu-bar commands get an `interval`, and
 * updateCommandMetadata only ever writes its own command's subtitle.
 */
export default async function Command() {
  const { orcaPath, summaryMode } =
    getPreferenceValues<Preferences.AgentsSummary>();

  try {
    const rows = await loadAgents(orcaPath, execFileAsync);
    await updateCommandMetadata({
      subtitle:
        summarize(rows, (summaryMode as SummaryMode) ?? "sessions") ??
        EXTENSION_NAME,
    });
  } catch {
    // Orca not running is the normal case for a background tick, not an error
    // worth a toast; drop the stale count instead of reporting last week's.
    await updateCommandMetadata({ subtitle: EXTENSION_NAME });
  }

  // Picking this entry in the root search should open the actual list, showing
  // everything: arriving from a count of blocked agents, the useful view is the
  // full picture with those agents on top, not a list pre-filtered down to them.
  if (environment.launchType === LaunchType.UserInitiated) {
    await launchCommand({
      name: "list-agents",
      type: LaunchType.UserInitiated,
      context: { status: "all" satisfies StatusFilter },
    });
  }
}
