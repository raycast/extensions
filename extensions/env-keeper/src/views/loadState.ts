import { showToast, Toast } from "@raycast/api";
import { type DictKey, t } from "../i18n.js";

/**
 * 页面加载的统一写法:开加载态 → 读盘 → 失败给提示 → 无论如何收掉加载态。
 *
 * 此前这几个页面是直线写法(`setLoading(true)` → `await 读盘` → `setLoading(false)`),
 * 读盘一抛错(权限、IO、文件被删),收尾那一步就再也走不到:界面永远转圈,
 * 而且错误连个提示都没有——用户看到的是"这个页面坏了",不知道坏在哪。
 */
export async function runLoad(
  setLoading: (value: boolean) => void,
  task: () => Promise<void>,
  failureTitle: DictKey,
): Promise<void> {
  setLoading(true);
  try {
    await task();
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: t(failureTitle),
      message: e instanceof Error ? e.message : String(e),
    });
  } finally {
    setLoading(false);
  }
}
