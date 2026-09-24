import { Toast, open, showToast } from "@raycast/api";

import {
  atLeast,
  installedVersion,
  readConfig,
  type HostbeamConfig,
} from "./hostbeam";

/** The Mac release each link first worked in. A link an older app does not
 *  know is ignored in silence, which is the failure this whole file exists to
 *  turn into a sentence. */
export const NEEDS = {
  beam: "0.1.22",
  /** `host` and `preferences` ship together, in the release after 0.1.22. */
  host: "0.1.23",
} as const;

/** Where the switch lives, said the way the app says it. */
const WHERE = "Hostbeam → Preferences → General → Beaming";

/** Opens Preferences on the pane holding the switch.
 *
 *  `hostbeam://preferences` is the one verb the app answers without
 *  permission — the door to the switch cannot be behind the switch — so this
 *  works from exactly the state it exists to get you out of, and launches
 *  Hostbeam if it is not running.
 */
async function openSettings() {
  await open("hostbeam://preferences?tab=general");
}

/**
 * Whether Hostbeam will listen to this extension, and if not, why — said in a
 * toast with the fix attached rather than a HUD that flashes the answer and
 * disappears.
 *
 * Two different problems wear the same symptom (nothing happens), so they get
 * two different answers: no config at all means the app has never run here,
 * and a config with the switch off means it is installed and ignoring us.
 */
export async function allowedToDrive(
  minimum: string,
): Promise<HostbeamConfig | null> {
  const config = readConfig();
  if (!config) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Hostbeam has not run on this Mac",
      message: "Open Hostbeam once, add a host, then try again.",
    });
    return null;
  }
  const version = installedVersion();
  if (!atLeast(version, minimum)) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Hostbeam ${minimum} or newer is needed`,
      message: `This Mac has ${version}. Updating is in About.`,
      primaryAction: {
        title: "Open Hostbeam About",
        onAction: async (toast) => {
          // The About pane holds Check for updates, and this link is the one
          // that works without permission — so the fix is reachable from the
          // state that needs it.
          await open("hostbeam://preferences?tab=about");
          await toast.hide();
        },
      },
    });
    return null;
  }
  if (config.settings?.allowUrlBeam === false) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Hostbeam is not accepting commands",
      message: `Turn on “Let other apps control Hostbeam” in ${WHERE}.`,
      primaryAction: {
        title: "Open Hostbeam Settings",
        onAction: async (toast) => {
          await openSettings();
          await toast.hide();
        },
      },
    });
    return null;
  }
  return config;
}
