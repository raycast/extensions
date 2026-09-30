import { getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { expiryWarning, preferredExpiry } from "./lib/expiry";
import { onlyFiles, uploadPaths } from "./lib/upload";

export default async function Command() {
  let paths: string[];
  try {
    paths = (await getSelectedFinderItems()).map((item) => item.path);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Select files in Finder first" });
    return;
  }

  const { files } = await onlyFiles(paths);
  if (files.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to upload",
      message: paths.length > 0 ? "Folders can't be uploaded, only files." : "Select files in Finder first.",
    });
    return;
  }

  const expires = preferredExpiry();
  const uploads = await uploadPaths(files, { expires });
  // The failure toast stays up when Delete After didn't take.
  if (uploads.length === files.length && !expiryWarning(uploads, expires)) {
    await showHUD(
      uploads.length === 1
        ? `Uploaded ${uploads[0].filename}, link copied`
        : `Uploaded ${uploads.length} files, links copied`,
    );
  }
}
