import { Clipboard, PopToRootType, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import type { AccountData } from "../../vendor/lib/types";
import { typeText } from "./helper";
import { consumeHotp, getVaultState } from "./vault-store";

const deliveringHotp = new Set<string>();

export type DeliveryMode = "copy" | "paste" | "type";

/** 复制 / 粘贴 / 真实输入。HOTP 必须先落盘递增，成功才允许把这个码交出去。 */
export async function deliverCode(account: AccountData, code: string, mode: DeliveryMode, closeAfterCopy = true): Promise<boolean> {
  if (!/^\d+$/.test(code)) {
    await showToast({ style: Toast.Style.Failure, title: "Code Unavailable", message: "Please try again shortly." });
    return false;
  }
  if (account.type === "hotp") {
    const current = getVaultState().accounts.find((item) => item.id === account.id);
    if (!current || current.type !== "hotp" || current.counter !== account.counter || current.secret !== account.secret || deliveringHotp.has(account.id)) {
      await showToast({ style: Toast.Style.Failure, title: "Code Changed", message: "Refresh and try again." });
      return false;
    }
    deliveringHotp.add(account.id);
    try {
      if (!(await consumeHotp(account.id))) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Save HOTP Counter",
          message: "Delivery cancelled; please retry.",
        });
        return false;
      }
    } finally {
      deliveringHotp.delete(account.id);
    }
  }
  if (mode === "type") {
    const result = await typeText(code);
    if (!result.ok) {
      await showToast({ style: Toast.Style.Failure, title: "Typing Failed", message: result.message });
      return false;
    }
    await closeMainWindow();
    return true;
  }
  if (mode === "paste") {
    try {
      await Clipboard.paste(code);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Paste Failed", message: String(error) });
      return false;
    }
    try {
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Pasted, but could not close Raycast automatically" });
    }
    return true;
  }
  try {
    await Clipboard.copy(code, { concealed: true });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Copy Failed", message: String(error) });
    return false;
  }
  const label = account.note || account.issuer || account.name;
  if (closeAfterCopy) {
    try {
      await showHUD(`Copied ${label} code`, { popToRootType: PopToRootType.Immediate });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Copied, but could not close Raycast automatically" });
    }
  } else {
    await showToast({ style: Toast.Style.Success, title: `Copied ${label} code` });
  }
  return true;
}
