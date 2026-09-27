import { Clipboard, showToast, Toast } from "@raycast/api";
import { t } from "../i18n.js";

/**
 * 复制「刷新命令」并把话说全。
 * `source ~/.env-keeper/shell.sh` 只能让已开的终端拿到新增和修改,停用 / 删除的东西它拿不掉;
 * 此前动作标题只写了前半句,后半句只在集成详情页有,在片段上按这个动作的人看不到
 */
export async function copyRefreshCommand(command: string): Promise<void> {
  await Clipboard.copy(command);
  await showToast({
    style: Toast.Style.Success,
    title: t("st.refreshCopiedTitle"),
    message: t("st.refreshCopiedMessage"),
  });
}
