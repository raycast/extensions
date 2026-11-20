import { Alert, confirmAlert } from "@raycast/api";
import { t } from "../i18n.js";

/**
 * 破坏性动作的确认框。三件固定的事在这里一次说清:
 * - 主按钮红色(用户一眼能看出这一下会丢东西)
 * - **Esc 一定等于「取消」**:dismissAction 漏写的话 Raycast 会给一个英文默认按钮,
 *   而且 Esc 会落到主按钮上——一回车就把东西删了
 * - 取消的文案走 i18n
 *
 * 用对象传参而不是三个位置参数:title / message / actionTitle 都是字符串,
 * 位置写反了编译器不会吭声,而这三样写反的后果是"确认框让人看不懂"。
 */
export async function confirmDestructive(options: {
  title: string;
  message: string;
  actionTitle: string;
}): Promise<boolean> {
  return confirmAlert({
    title: options.title,
    message: options.message,
    primaryAction: { title: options.actionTitle, style: Alert.ActionStyle.Destructive },
    dismissAction: { title: t("common.cancel") },
  });
}
