import type { BrowserExtension } from "@raycast/api";
import type { BrowserEntry } from "../types";

export interface BrowserIconAdapter {
  /** 以现有结果 ID 返回可用图标；缺失表示沿用来源图标。 */
  getIcons(
    entries: readonly BrowserEntry[],
    version: number,
    signal?: AbortSignal,
  ): Promise<ReadonlyMap<string, string>>;
}

interface BrowserExtensionClient {
  isAvailable(): boolean;
  getTabs(): Promise<BrowserExtension.Tab[]>;
}

export class RaycastBrowserIconAdapter implements BrowserIconAdapter {
  private snapshot?: {
    version: number;
    pending: Promise<Map<string, BrowserExtension.Tab | undefined>>;
  };

  constructor(
    private client: BrowserExtensionClient,
    private fallback?: BrowserIconAdapter,
  ) {}

  async getIcons(
    entries: readonly BrowserEntry[],
    version: number,
    signal?: AbortSignal,
  ) {
    const icons = new Map<string, string>();
    const candidates = entries.filter(
      (entry) => !entry.incognito && (entry.source !== "tab" || entry.tabId),
    );
    if (!candidates.length || signal?.aborted) return icons;
    // 搜索、来源切换和分页复用同一快照；刷新浏览器数据时重新读取。
    if (this.snapshot?.version !== version) {
      this.snapshot = { version, pending: this.read() };
    }
    const snapshot = await this.snapshot.pending;
    const pageIcons = new Map<string, string | undefined>();
    for (const tab of snapshot.values()) {
      if (!tab?.favicon?.trim()) continue;
      // 同一页面在多个标签中图标不一致时，不猜测历史或书签属于哪一个。
      const ambiguous =
        pageIcons.has(tab.url) && pageIcons.get(tab.url) !== tab.favicon;
      pageIcons.set(tab.url, ambiguous ? undefined : tab.favicon);
    }
    for (const entry of candidates) {
      if (entry.source === "tab") {
        const tab = snapshot.get(entry.tabId!);
        if (tab?.url === entry.url && tab.favicon?.trim())
          icons.set(entry.id, tab.favicon);
      } else {
        const icon = pageIcons.get(entry.url);
        if (icon) icons.set(entry.id, icon);
      }
    }
    const missing = candidates.filter(
      (entry) => entry.source !== "tab" && !icons.has(entry.id),
    );
    if (this.fallback && missing.length && !signal?.aborted) {
      try {
        const cached = await this.fallback.getIcons(missing, version, signal);
        for (const entry of missing) {
          const icon = cached.get(entry.id);
          if (icon) icons.set(entry.id, icon);
        }
      } catch {
        // 本地缓存是可选来源，读取失败不影响已有图标。
      }
    }
    return icons;
  }

  private async read() {
    const tabs = new Map<string, BrowserExtension.Tab | undefined>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // 必须先检查；直接调用 getTabs 可能弹出浏览器扩展安装提示。
      if (!this.client.isAvailable()) return tabs;
      const timeout = new Promise<BrowserExtension.Tab[]>((resolve) => {
        timer = setTimeout(() => resolve([]), 1500);
      });
      const rows = await Promise.race([this.client.getTabs(), timeout]);
      for (const tab of rows) {
        const id = String(tab.id);
        // SDK 没有 browser/profile 字段；重复 ID 不猜测归属。
        tabs.set(id, tabs.has(id) ? undefined : tab);
      }
    } catch {
      // 可选能力失败时静默回退，不改变 JXA 标签结果与来源状态。
    } finally {
      clearTimeout(timer);
    }
    return tabs;
  }
}
