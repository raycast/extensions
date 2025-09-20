import { downloadFile, extractDictionary, getLatestDictionaryUrl } from "./dictionary/download";
import { DOWNLOAD_PATH, DB_PATH, EXTRACT_PATH, SQLITE_WASM_PATH } from "./constants";
import { populateTables } from "./dictionary/populate";
import { showToast, Toast } from "@raycast/api";
import initSqlJs from "sql.js";
import fs from "node:fs";

export default async function Command() {
  // Use abort controller to allow cancellation of update process
  const abortController = new AbortController();
  const { signal: abortSignal } = abortController;
  abortSignal.addEventListener("abort", () => {
    showToast({
      style: Toast.Style.Success,
      title: "Dictionary update cancelled",
      message: "",
    });
  });

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading latest dictionary...",
    message: `Progress: 0%`,
    primaryAction: {
      title: "Cancel Update",
      onAction: () => {
        abortController.abort();
      },
    },
  });

  const dictionaryUrl = await getLatestDictionaryUrl();
  if (!dictionaryUrl) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to find latest dictionary";
    toast.message = "Please try again later.";
    return;
  }

  await downloadFile(dictionaryUrl, DOWNLOAD_PATH, toast, abortSignal);
  await extractDictionary(DOWNLOAD_PATH, EXTRACT_PATH, toast, abortSignal);

  const wasmBinary = fs.readFileSync(SQLITE_WASM_PATH);
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database();

  const success = await populateTables(db, toast, abortSignal);
  if (success) {
    db.run("VACUUM;");
    await fs.promises.writeFile(DB_PATH, db.export());
    toast.style = Toast.Style.Success;
    toast.title = "Dictionary updated successfully";
    toast.message = "";
  } else if (!abortSignal.aborted) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to update dictionary";
    toast.message = "Please try again later.";
  }

  db.close();
}
