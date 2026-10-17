import { closeMainWindow, open } from "@raycast/api";

import { NEEDS, allowedToDrive } from "./permission";

/** Ask Hostbeam to beam whatever screenshot is on the clipboard.
 *
 *  The permission is checked first rather than fired-and-hoped: with the
 *  switch off the URL is ignored by design, and a command that said
 *  "Beaming…" into that silence would look broken rather than switched off.
 *  The window stays open when something is wrong, so the toast explaining it
 *  has somewhere to live — and something to be clicked on.
 */
export default async function main() {
  if (!(await allowedToDrive(NEEDS.beam))) return;
  await closeMainWindow();
  await open("hostbeam://beam");
}
