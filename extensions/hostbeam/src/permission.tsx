import { Toast, open, showToast } from "@raycast/api";

import {
  atLeast,
  installedVersion,
  readConfig,
  type HostbeamConfig,
} from "./hostbeam";

/** The oldest Mac release each command drives. A link an older app does not
 *  know is ignored in silence, which is the failure this whole file exists to
 *  turn into a sentence. */
export const NEEDS = {
  /** `beam` itself works from 0.1.22, but the switch toast's button opens
   *  `preferences`, which 0.1.22 ignores. 0.1.23 shipped the same day. */
  beam: "0.1.23",
  /** `host` and `preferences` ship together, in the release after 0.1.22. */
  host: "0.1.23",
} as const;

/** Where the switch lives, said the way the app says it. */
const WHERE = "Hostbeam → Preferences → General → Beaming";

/** Always the latest Mac build — the site's download button points here too. */
const DOWNLOAD = "https://download.hostbeam.app/Hostbeam.dmg";

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
      message: `This Mac has ${version}. Download the latest to update.`,
      primaryAction: {
        title: "Download Latest Hostbeam",
        onAction: async (toast) => {
          // Not `hostbeam://preferences?tab=about`: that link arrived in
          // 0.1.23, after every version old enough to land here, so the app
          // would ignore it in silence. The download works from any version.
          await open(DOWNLOAD);
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
