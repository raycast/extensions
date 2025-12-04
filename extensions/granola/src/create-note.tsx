import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Opening Granola",
    });

    await execPromise("open 'granola://new-document?creation_source=raycast'");

    await showToast({
      style: Toast.Style.Success,
      title: "Opened new note in Granola",
    });
  } catch (error) {
    await showFailureToast({ title: "Failed to open Granola", message: String(error) });
  }
}
