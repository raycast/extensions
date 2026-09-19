import { Clipboard, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import type { AccountData } from "../../vendor/lib/types";
import { typeText } from "./helper";
import { consumeHotp } from "./vault-store";

export type DeliveryMode = "copy" | "paste" | "type";

/** 复制 / 粘贴 / 真实输入。HOTP 必须先落盘递增，成功才允许把这个码交出去。 */
export async function deliverCode(account: AccountData, code: string, mode: DeliveryMode): Promise<boolean> {
  if (!/^\d+$/.test(code)) {
    await showToast({ style: Toast.Style.Failure, title: "验证码不可用", message: "请稍后重试。" });
    return false;
  }
  if (account.type === "hotp" && !(await consumeHotp(account.id))) {
    await showToast({
      style: Toast.Style.Failure,
      title: "HOTP 计数器未能保存",
      message: "已取消发送，请重试。",
    });
    return false;
  }
  if (mode === "type") {
    const result = await typeText(code);
    if (!result.ok) {
      await showToast({ style: Toast.Style.Failure, title: "真实输入失败", message: result.message });
      return false;
    }
    await closeMainWindow();
    return true;
  }
  if (mode === "paste") {
    await Clipboard.paste(code);
    await closeMainWindow();
    return true;
  }
  await Clipboard.copy(code, { concealed: true });
  const label = account.note || account.issuer || account.name;
  await showHUD(`已复制 ${label} 验证码`);
  return true;
}
