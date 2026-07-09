import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import { Clipboard, open, showToast, Toast } from "@raycast/api";

const pexec = promisify(exec);
const pexecFile = promisify(execFile);

export async function copyToClipboard(
  text: string,
  title = "Copied",
): Promise<void> {
  await Clipboard.copy(text);
  await showToast({ style: Toast.Style.Success, title });
}

export async function openInEditor(filePath: string): Promise<void> {
  for (const bin of ["cursor", "code"]) {
    try {
      await pexec(`command -v ${bin}`);
      await pexecFile(bin, [filePath]);
      return;
    } catch {
      // try next editor
    }
  }
  try {
    await open(filePath);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open editor",
    });
  }
}
