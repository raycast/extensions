import { showToast, Toast } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";

export async function handleKill(
  process: ProcessInfo,
  killCallback: () => Promise<void>,
  reloadCallback?: () => Promise<void>
) {
  try {
    await killCallback();
    await showToast({
      style: Toast.Style.Success,
      title: "Killed Process",
      message: `${process.name} (${process.pid})`,
    });
    if (reloadCallback !== undefined) await reloadCallback();
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${(e as Error).message ?? e}`,
    });
  }
}
