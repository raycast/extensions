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
  if (entry.source !== "tab")
    return { message: "Open this page in Chrome to preview its content." };
  if (entry.incognito)
    return { message: "Incognito tabs show basic information only." };
  const tabId = Number(entry.tabId);
  if (
    !Number.isSafeInteger(tabId) ||
    tabId <= 0 ||
    !/^https?:\/\//i.test(entry.url)
  )
    return { message: "Content preview is not supported for this page." };
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopped = () => signal.aborted || expired;
  const matches = async () => {
    const tabs = (await client.getTabs()).filter((tab) => tab.id === tabId);
    return tabs.length === 1 && tabs[0].url === entry.url;
  };
  const changed = {
    message: "The tab was closed or its URL changed. Reopen the search.",
  };
  try {
    if (stopped()) return {};
    if (!client.isAvailable())
      return {
        message:
          "Install and connect the Raycast Browser Extension to preview page content.",
      };
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
        : {
            message: "No page content was extracted. View this page in Chrome.",
          };
    };
    return await Promise.race([
      read(),
      new Promise<PagePreview>((resolve) => {
        timer = setTimeout(() => {
          expired = true;
          resolve({
            message:
              "Reading page content timed out. Refresh the preview to try again.",
          });
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
          "This tab is not connected to the Raycast Browser Extension. Reload the page in Chrome, then refresh the preview. If content is still unavailable, check the extension’s access to this site.",
      };
    return {
      message:
        "Could not read page content. Refresh the preview to try again, or view this page in Chrome.",
    };
  } finally {
    clearTimeout(timer);
  }
}
