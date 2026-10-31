import type { SearchPage } from "./source";
export interface CustomSource {
  url: string;
  results: string;
  image: string;
  title?: string;
  hasMore?: string;
}
function field(value: unknown, path: string): unknown {
  return path
    ? path
        .split(".")
        .reduce<unknown>(
          (v, key) =>
            v && typeof v === "object"
              ? (v as Record<string, unknown>)[key]
              : undefined,
          value,
        )
    : value;
}
export function customUrl(
  config: CustomSource,
  keyword: string,
  page: number,
): string {
  if (!config.url.includes("{query}"))
    throw new Error("自定义源 URL 必须包含 {query}");
  const url = new URL(
    config.url
      .replaceAll("{query}", encodeURIComponent(keyword))
      .replaceAll("{page}", String(page)),
  );
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("自定义源必须是无内嵌凭据的 HTTP(S) URL");
  return url.href;
}
export function parseCustom(
  value: unknown,
  config: CustomSource,
  keyword: string,
  page: number,
): SearchPage {
  const entries = field(value, config.results);
  if (!Array.isArray(entries))
    throw new Error("自定义源的结果路径没有指向数组");
  const items = entries.map((entry, index) => {
    const raw = field(entry, config.image);
    if (typeof raw !== "string")
      throw new Error("自定义源图片字段必须为 URL 字符串");
    const url = new URL(raw);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error("图片地址必须为 HTTP(S) URL");
    const title = config.title ? field(entry, config.title) : undefined;
    return {
      url: url.href,
      pageUrl: url.href,
      title: typeof title === "string" ? title : `${keyword} · ${index + 1}`,
    };
  });
  const more = config.hasMore ? field(value, config.hasMore) : false;
  return {
    items,
    next:
      items.length &&
      (more === true || more === 1) &&
      config.url.includes("{page}")
        ? customUrl(config, keyword, page + 1)
        : undefined,
  };
}
export function readConfig(json: string): CustomSource {
  const value = JSON.parse(json) as CustomSource;
  if (
    !value ||
    typeof value.url !== "string" ||
    typeof value.results !== "string" ||
    typeof value.image !== "string" ||
    (value.title !== undefined && typeof value.title !== "string") ||
    (value.hasMore !== undefined && typeof value.hasMore !== "string")
  )
    throw new Error("源配置需要 url、results、image 字符串字段");
  return value;
}
export async function searchCustom(
  configText: string,
  keyword: string,
  page: number,
  signal?: AbortSignal,
): Promise<SearchPage> {
  const config = readConfig(configText);
  const response = await fetch(customUrl(config, keyword, page), { signal });
  if (!response.ok)
    throw new Error(`自定义源请求失败：HTTP ${response.status}`);
  return parseCustom(await response.json(), config, keyword, page);
}
