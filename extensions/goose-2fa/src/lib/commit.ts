import { Toast, showToast } from "@raycast/api";
import type { SyncSnapshot } from "../../../src/lib/data-transfer";
import { getVaultState, updateVault } from "./vault-store";

/** 统一提交入口：写盘成功才提示成功，失败时把数据源文件的真实原因报给用户。 */
export async function commit(
  updater: (snapshot: SyncSnapshot) => SyncSnapshot,
  successMessage: string,
): Promise<boolean> {
  const ok = await updateVault(updater);
  if (ok) {
    await showToast({ style: Toast.Style.Success, title: successMessage });
    return true;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "没有保存",
    message: getVaultState().message ?? "请检查数据源文件后重试。",
  });
  return false;
}
