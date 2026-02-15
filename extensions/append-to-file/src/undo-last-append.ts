import {
  closeMainWindow,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { undoLastAppend } from "./lib/append-history";

export default async function Command() {
  try {
    const result = await undoLastAppend();
    const fileName = path.basename(result.filePath);
    const suffix = result.restored === "deleted" ? " (removed new file)" : "";
    await showHUD(`Undid append in ${fileName}${suffix}`);
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Undo failed.";
    await showToast({
      style: Toast.Style.Failure,
      title: "Undo last append failed",
      message,
    });
  }
}
