import type { BrowserEntry } from "../types";

export interface PageContentClient {
  isAvailable(): boolean;
  getTabs(): Promise<Array<{ id: number; url: string }>>;
  getContent(options: { tabId: number; format: "markdown" }): Promise<string>;
}
export interface PagePreview {
  markdown?: string;
  message?: string;
  truncated?: boolean;
}

export async function readPagePreview(
  entry: BrowserEntry,
  client: PageContentClient,
  signal: AbortSignal,
): Promise<PagePreview> {
  if (entry.source !== "tab") return { message: "打开页面后可预览正文。" };
  if (entry.incognito) return { message: "无痕标签仅展示基础信息。" };
  const tabId = Number(entry.tabId);
  if (
    !Number.isSafeInteger(tabId) ||
    tabId <= 0 ||
    !/^https?:\/\//i.test(entry.url)
  )
    return { message: "此页面不支持正文预览。" };
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopped = () => signal.aborted || expired;
  const matches = async () => {
    const tabs = (await client.getTabs()).filter((tab) => tab.id === tabId);
    return tabs.length === 1 && tabs[0].url === entry.url;
  };
  const changed = { message: "标签页已关闭或地址发生变化，请重新打开搜索。" };
  try {
    if (stopped()) return {};
    if (!client.isAvailable())
      return { message: "安装并连接 Raycast 浏览器扩展后可预览正文。" };
    const read = async (): Promise<PagePreview> => {
      if (!(await matches())) return changed;
      if (stopped()) return {};
      const content = await client.getContent({ tabId, format: "markdown" });
      if (stopped()) return {};
      if (!(await matches())) return changed;
      if (stopped()) return {};
      const markdown = content.trim();
      return markdown
        ? {
            markdown: markdown.slice(0, 8000),
            truncated: markdown.length > 8000,
          }
        : { message: "未提取到正文，可在 Chrome 中查看。" };
    };
    return await Promise.race([
      read(),
      new Promise<PagePreview>((resolve) => {
        timer = setTimeout(() => {
          expired = true;
          resolve({ message: "正文读取超时，可刷新预览重试。" });
        }, 6000);
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Companion 将“标签没有内容脚本接收端”映射为此错误；与整个扩展断连不同。
    if (
      message.includes("Access to this page is restricted") ||
      message.includes("Receiving end does not exist")
    )
      return {
        message:
          "此标签页尚未连接 Raycast 浏览器扩展。请先在 Chrome 中刷新该页面，再回来刷新预览；若仍不可读，请检查扩展对此网站的访问权限。",
      };
    return {
      message: "正文读取失败。可刷新预览重试，或在 Chrome 中查看此页面。",
    };
  } finally {
    clearTimeout(timer);
  }
}
