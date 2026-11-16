import {
  Clipboard,
  closeMainWindow,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedText,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { appendResponse, httpError, prepareRequest, SettingsError } from "./core";
import type { Settings } from "./core";

export default async function Command() {
  try {
    let text: string;
    try {
      text = await getSelectedText();
    } catch {
      await showHUD("请先选中要添加 emoji 的文字");
      return;
    }
    const request = prepareRequest(text, getPreferenceValues<Settings>());
    await closeMainWindow();
    const originalApp = await getFrontmostApplication();
    await showHUD("正在选择应景 emoji…");
    let response: Response;
    try {
      response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: AbortSignal.timeout(30000),
        redirect: "error",
      });
    } catch {
      throw new Error("API 连接失败或请求超时，请检查网络和 API 地址。");
    }
    if (!response.ok) throw httpError(response.status);
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error("API 返回的不是有效 JSON，请检查 API 地址。");
    }
    const result = appendResponse(text, data, request.maxEmojis);
    if (result === text) {
      await showHUD("末尾已有相同 emoji，无需添加");
      return;
    }
    // Avoid pasting into another app or an edited/deselected input after an API wait.
    const currentApp = await getFrontmostApplication();
    const currentText = await getSelectedText().catch(() => undefined);
    if (currentApp.path !== originalApp.path || currentText !== text) {
      await Clipboard.copy(result);
      await showHUD("选区或应用已改变，结果已复制，请手动粘贴");
      return;
    }
    await Clipboard.paste(result);
    await showHUD("已添加应景 emoji");
  } catch (error) {
    if (error instanceof SettingsError) await openExtensionPreferences();
    await showHUD(error instanceof Error ? error.message : "添加失败，原文未修改");
  }
}
