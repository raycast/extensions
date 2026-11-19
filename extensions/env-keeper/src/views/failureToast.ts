import { showToast, Toast } from "@raycast/api";

/**
 * 失败提示的统一写法。
 * 这个形状在扩展里重复了三十多处——`showToast({ style: Failure, title: <文案>, message: e instanceof Error ? e.message : String(e) })`。
 * 抽出来只为一件事:错误"怎么显示"以后只有一处可改(比如哪天要给所有失败提示加个「查看详情」)。
 */
export async function showFailureToast(title: string, error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
