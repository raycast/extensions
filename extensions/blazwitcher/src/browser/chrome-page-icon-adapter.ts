import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { BrowserEntry } from "../types";
import type { BrowserIconAdapter } from "./browser-icon-adapter";
import { queryReadonly } from "./sqlite";

export class ChromePageIconAdapter implements BrowserIconAdapter {
  private version?: number;
  private cache = new Map<string, string | undefined>();
  private directory?: string;
  private files = new Set<string>();
  private queue: Promise<unknown> = Promise.resolve();

  getIcons(
    entries: readonly BrowserEntry[],
    version: number,
    signal?: AbortSignal,
  ) {
    const pending = this.queue.then(() => this.read(entries, version, signal));
    this.queue = pending.catch(() => {});
    return pending;
  }

  dispose() {
    const pending = this.queue.then(async () => {
      if (this.directory)
        await rm(this.directory, { recursive: true, force: true });
      this.directory = undefined;
      this.files.clear();
      this.cache.clear();
      this.version = undefined;
    });
    this.queue = pending.catch(() => {});
    return pending;
  }

  private async read(
    entries: readonly BrowserEntry[],
    version: number,
    signal?: AbortSignal,
  ) {
    const icons = new Map<string, string>();
    if (signal?.aborted) return icons;
    if (this.version !== version) {
      this.cache.clear();
      this.version = version;
    }
    const candidates = entries.filter(
      (entry) =>
        entry.source !== "tab" &&
        !entry.incognito &&
        entry.profile &&
        /^https?:\/\//i.test(entry.url),
    );
    const key = (profile: string, url: string) =>
      JSON.stringify([profile, url]);
    const profiles = new Map<string, Set<string>>();
    for (const entry of candidates) {
      const profile = entry.profile!.path;
      if (this.cache.has(key(profile, entry.url))) continue;
      const urls = profiles.get(profile) ?? new Set<string>();
      urls.add(entry.url);
      profiles.set(profile, urls);
    }
    for (const [profile, urls] of profiles) {
      const pending = [...urls];
      for (let offset = 0; offset < pending.length; offset += 80) {
        if (signal?.aborted) return icons;
        const batch = pending.slice(offset, offset + 80);
        try {
          // 精确匹配所属配置的页面 URL，优先取接近 32px 的 PNG。
          const values = batch
            .map((url) => `'${url.replaceAll("'", "''")}'`)
            .join(",");
          const rows: { page_url: string; image: string }[] = JSON.parse(
            (await queryReadonly(
              path.join(profile, "Favicons"),
              `
            SELECT page_url, image FROM (
              SELECT m.page_url, hex(b.image_data) AS image,
                ROW_NUMBER() OVER (PARTITION BY m.page_url ORDER BY abs(b.width - 32), b.width DESC, b.id DESC) AS rank
              FROM icon_mapping m JOIN favicon_bitmaps b ON b.icon_id = m.icon_id
              WHERE m.page_url IN (${values}) AND length(b.image_data) > 0
            ) WHERE rank = 1
          `,
            )) || "[]",
          );
          if (signal?.aborted) return icons;
          for (const row of rows) {
            if (signal?.aborted) return icons;
            const data = Buffer.from(row.image, "hex");
            if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
              continue;
            this.directory ??= await mkdtemp(
              path.join(tmpdir(), "blazwitcher-page-icons-"),
            );
            const filename = path.join(
              this.directory,
              `${createHash("sha256").update(data).digest("hex")}.png`,
            );
            if (!this.files.has(filename)) {
              await writeFile(filename, data, { mode: 0o600 });
              this.files.add(filename);
            }
            this.cache.set(key(profile, row.page_url), filename);
          }
          // 整批完成后才缓存缺失；取消不能把未处理页面记为不存在。
          for (const url of batch) {
            const cacheKey = key(profile, url);
            if (!this.cache.has(cacheKey)) this.cache.set(cacheKey, undefined);
          }
        } catch {
          // 缓存缺失、被锁住或损坏时沿用来源图标；刷新数据后再尝试。
          for (const url of batch) this.cache.set(key(profile, url), undefined);
        }
      }
    }
    for (const entry of candidates) {
      const icon = this.cache.get(key(entry.profile!.path, entry.url));
      if (icon) icons.set(entry.id, icon);
    }
    return icons;
  }
}
