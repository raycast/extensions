import { showToast, ToastStyle } from "@raycast/api";
import { IProcessInfo } from "../models/interfaces";

export async function handleKill(
  process: IProcessInfo,
  killCallback: () => Promise<void>,
  reloadCallback?: () => Promise<void>
) {
  try {
    await killCallback();
    await showToast(ToastStyle.Success, "Killed Process", `${process.name} (${process.pid})`);
    if (reloadCallback !== undefined) await reloadCallback();
  } catch (e) {
    await showToast(ToastStyle.Failure, `${(e as Error).message ?? e}`);
  }
}
