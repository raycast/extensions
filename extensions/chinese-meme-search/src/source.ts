export interface Meme {
  url: string;
  title: string;
  pageUrl: string;
}
export interface SearchPage {
  items: Meme[];
  next?: string;
}
export async function downloadImage(
  url: string,
): Promise<{ bytes: Uint8Array; extension: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`图片下载失败：HTTP ${response.status}`);
  const type = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (!type?.startsWith("image/")) throw new Error("图片源返回了非图片内容");
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/svg+xml": ".svg",
    "image/heic": ".heic",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
  };
  const extension = extensions[type];
  if (!extension) throw new Error(`不支持的图片类型：${type}`);
  return { bytes: new Uint8Array(await response.arrayBuffer()), extension };
}
