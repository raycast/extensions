import {
  getSelectedFinderItems,
  showHUD,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { basename } from "path";
import { getCrocPath, buildCrocArgs } from "./utils/croc";
import { spawnCrocSend, computeFileSize } from "./utils/process";
import { addRecord, updateRecord } from "./utils/history";

const SESSION_ID = Math.random().toString(36).slice(2);

export default async function QuickSend(): Promise<void> {
  const crocPath = getCrocPath();
  if (!crocPath) {
    await showHUD("⚠️ croc is not installed");
    return;
  }

  let files: string[];
  try {
    const items = await getSelectedFinderItems();
    files = items.map((i) => i.path);
  } catch {
    files = [];
  }

  if (files.length === 0) {
    await showHUD("No files selected in Finder");
    return;
  }

  const label =
    files.length === 1 ? basename(files[0]) : `${files.length} files`;
  await showHUD(`Preparing to send: ${label}`);

  const args = buildCrocArgs("send", files);

  // Write-ahead: record with in_progress status
  let recordId: string | null = null;

  // Best-effort SIGTERM handler
  process.on("SIGTERM", () => {
    if (recordId) {
      updateRecord(recordId, { status: "failed" }).finally(() =>
        process.exit(1),
      );
    } else {
      process.exit(1);
    }
  });

  await new Promise<void>((resolve) => {
    spawnCrocSend(
      crocPath,
      args,
      async (phrase) => {
        const size = computeFileSize(files);
        const record = await addRecord({
          type: "send",
          files,
          phrase,
          status: "in_progress",
          size,
          sessionId: SESSION_ID,
        });
        recordId = record.id;
        await Clipboard.copy(phrase);
        await showHUD(`Code copied: ${phrase}`);
      },
      async (prog) => {
        await showHUD(`Sending ${label}: ${prog.percent}%`);
      },
      async () => {
        if (recordId) await updateRecord(recordId, { status: "success" });
        await showHUD(`✓ Sent: ${label}`);
        resolve();
      },
      async (err) => {
        if (recordId) await updateRecord(recordId, { status: "failed" });
        await showToast({
          style: Toast.Style.Failure,
          title: "Send failed",
          message: err.message,
        });
        resolve();
      },
    );
  });
}
