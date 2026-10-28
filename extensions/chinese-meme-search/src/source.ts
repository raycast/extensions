export interface Meme { url: string; title: string; pageUrl: string }
export interface SearchPage { items: Meme[]; next?: string }
const endpoint = "https://h5api.sginput.qq.com/wxbq/search";
export function searchUrl(keyword: string, page = 1): string {
  return `${endpoint}?${new URLSearchParams({ key: keyword.trim(), page: String(page), num: "20" })}`;
}

export function parsePage(value: unknown, url: string): SearchPage {
  if (!value || typeof value !== "object") throw new Error("表情接口返回格式异常");
  const data = value as { code?: number; msg?: string; data?: unknown[]; hasMore?: number; endFlag?: boolean };
  if (data.code !== 0) throw new Error(`表情搜索失败：${data.msg || data.code || "未知错误"}`);
  if (!Array.isArray(data.data)) throw new Error("表情接口缺少结果列表");
  const request = new URL(url);
  const keyword = request.searchParams.get("key") || "表情包";
  const page = Number(request.searchParams.get("page"));
  const items: Meme[] = [];
  const seen = new Set<string>();
  for (const entry of data.data) {
    if (!entry || typeof entry !== "object" || !("indexUrl" in entry) || typeof entry.indexUrl !== "string") throw new Error("表情接口返回了无效图片");
    const image = new URL(entry.indexUrl);
    if (image.protocol !== "https:" || image.hostname !== "biaoqing.gtimg.com") throw new Error("表情接口返回了未知图片地址");
    if (seen.has(image.href)) continue;
    seen.add(image.href);
    items.push({ url: image.href, title: `${keyword} · ${(page - 1) * 20 + items.length + 1}`, pageUrl: image.href });
  }
  return { items, next: items.length && data.hasMore === 1 && data.endFlag !== true ? searchUrl(keyword, page + 1) : undefined };
}

export async function searchPage(url: string, signal?: AbortSignal): Promise<SearchPage> {
  const response = await fetch(url, { signal });
  if (response.status === 429) throw new Error("表情源暂时限流，请稍后重新搜索（HTTP 429）");
  if (!response.ok) throw new Error(`表情搜索失败：HTTP ${response.status}`);
  return parsePage(await response.json(), url);
}

export async function downloadImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`图片下载失败：HTTP ${response.status}`);
  if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error("图片源返回了非图片内容");
  return new Uint8Array(await response.arrayBuffer());
}
