import { getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { expiryWarning, preferredExpiry } from "./lib/expiry";
import { batchSummary, onlyFiles, uploadPaths } from "./lib/upload";
import { FILE_MANAGER } from "./lib/platform";

export default async function Command() {
  let paths: string[];
  try {
    paths = (await getSelectedFinderItems()).map((item) => item.path);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: `Select files in ${FILE_MANAGER} first` });
    return;
  }

  const { files } = await onlyFiles(paths);
  if (files.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to upload",
      message: paths.length > 0 ? "Folders can't be uploaded, only files." : `Select files in ${FILE_MANAGER} first.`,
    });
    return;
  }

  const expires = preferredExpiry();
  const uploads = await uploadPaths(files, { expires });
  // The failure toast stays up when Delete After didn't take.
  if (uploads.length === files.length && !expiryWarning(uploads, expires)) {
    if (uploads.length === 1) {
      await showHUD(
        uploads[0].reused
          ? "Already uploaded, copied the existing link"
          : `Uploaded ${uploads[0].filename}, link copied`,
      );
    } else {
      const summary = batchSummary(uploads);
      await showHUD(`${summary.title}. ${summary.note}Links copied`);
    }
  }
}
