import { updateCommandMetadata } from "@raycast/api";
import { findRunpool, getStatus, loadLabel } from "./lib/runpool";

/**
 * The machine's load average, in this command's subtitle.
 *
 * Off by default: it is not about pools, and most people will not want it.
 *
 * It exists because a red CI run has two possible causes that look identical
 * in a log. A timing-sensitive test failing on a machine at three times its
 * core count is almost certainly the machine, and knowing that before opening
 * the log saves the whole investigation.
 *
 * Load comes from runpool rather than being read here, so the number matches
 * the one runpool acts on when it decides the machine is contended.
 *
 * Jobs are deliberately absent: Runner Status already reports them, and
 * repeating a figure across two subtitles only invites them to disagree.
 */
export default async function Command() {
  if (!findRunpool()) {
    await updateCommandMetadata({ subtitle: "runpool not installed" });
    return;
  }

  try {
    const { machine } = await getStatus({ local: true });
    await updateCommandMetadata({ subtitle: loadLabel(machine) });
  } catch {
    // Runs unattended every minute, so a transient failure must not raise a
    // toast over whatever the user is actually doing.
    await updateCommandMetadata({ subtitle: "Load unavailable" });
  }
}
