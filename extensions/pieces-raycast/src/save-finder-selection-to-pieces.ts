import * as fs from "fs";
import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import Notifications from "./ui/Notifications";
import { saveFileToPieces } from "./actions/saveAsset";
import piecesHealthCheck from "./connection/health/piecesHealthCheck";

export default async function Command() {
  const healthy = await piecesHealthCheck();
  if (!healthy) return;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading Finder selection",
  });
  const finderSelection = await getSelectedFinderItems().catch(() => null);
  toast.hide();

  if (!finderSelection) {
    return await Notifications.getInstance().errorToast(
      "Finder is not the frontmost application!",
    );
  } else if (!finderSelection.length) {
    return await Notifications.getInstance().errorToast(
      "There is no selected items in Finder!",
    );
  }

  const filteredItems = finderSelection.filter((el) => {
    return !fs.statSync(el.path).isDirectory();
  });

  if (!filteredItems.length) {
    return await Notifications.getInstance().errorToast(
      "There is no files selected in the Finder. This command only supports saving files, not directories.",
    );
  }

  await Promise.all(finderSelection.map((el) => saveFileToPieces(el.path)));
}
