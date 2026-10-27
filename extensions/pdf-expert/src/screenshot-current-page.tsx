import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import {
  copyPageImageToClipboard,
  getCurrentPageNumber,
  getFrontWindowTitle,
  pickCurrentDocument,
} from "./lib/current-page";
import { getOpenTabs, isInstalled, isRunning } from "./lib/pdf-expert";

export default async function ScreenshotCurrentPage() {
  if (!isInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "PDF Expert is not installed",
    });
    return;
  }
  if (!isRunning()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "PDF Expert is not running",
    });
    return;
  }

  const doc = pickCurrentDocument(getOpenTabs(), getFrontWindowTitle());
  if (!doc) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No PDF open in PDF Expert",
    });
    return;
  }
  if (!doc.exists) {
    await showToast({
      style: Toast.Style.Failure,
      title: "File not found",
      message: doc.path,
    });
    return;
  }

  const page = getCurrentPageNumber(doc.path) ?? 1;
  const dpi =
    Number(getPreferenceValues<Preferences.ScreenshotCurrentPage>().dpi) || 216;

  try {
    const info = copyPageImageToClipboard(doc.path, page, dpi);
    await showHUD(`Copied page ${page}/${info.pageCount} of ${doc.fullName}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not copy page",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
