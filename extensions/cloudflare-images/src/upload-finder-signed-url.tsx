import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Combo-locked variant: force Signed URLs + raw URL format + copy to
 * clipboard. Single-hotkey path for "I want signed raw URLs for selected
 * Finder files" without changing preferences. Combines the `as Signed`
 * axis with the `as URL` axis.
 *
 * Note: this differs from `Upload Selected File as Signed Image` (which
 * also produces raw signed URLs, the two are functionally equivalent
 * because the Finder pipeline always copies and never pastes). Kept as
 * a separate command for naming consistency with the clipboard family.
 */
export default async function () {
  await runUploadFinder({ signed: true, format: "raw" });
}
