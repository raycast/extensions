import { exportWithToast } from "./helpers/import-export";

/**
 * No-view command. A toast rather than a HUD, because a HUD closes Raycast and can't carry Show in Finder.
 */
export default async function ExportAppsCommand() {
  await exportWithToast();
}
