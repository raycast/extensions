import { t } from "./i18n.ts";
/** Templates may only occur after the authority, never in credentials/host/scheme. */
export function normalizeBookmarkUrl(raw: string): string {
  if (
    typeof raw !== "string" ||
    !raw.trim() ||
    raw.length > 8192 ||
    /[\s\\]/u.test(raw) ||
    [...raw].some((c) => c.charCodeAt(0) < 32)
  )
    throw new Error(t("INVALID_INPUT: 不支持的网址"));
  const input = raw.trim();
  const value = /^https?:\/\//i.test(input)
    ? input
    : /^[\w+.-]+:/.test(input) &&
        !/^(?:localhost|[\w-]+(?:\.[\w-]+)+):\d+(?:[/?#]|$)/i.test(input)
      ? ""
      : `https://${input}`;
  const authority = value.match(/^https?:\/\/[^/?#]+/i)?.[0];
  if (!authority || /[{}]/.test(authority))
    throw new Error(t("INVALID_INPUT: 模板不能改变协议或主机"));
  const fields = [...value.matchAll(/\{([^{}]+)\}/g)];
  if (
    /[{}]/.test(value.replace(/\{[^{}]+\}/g, "")) ||
    fields.some((m) => !/^[\p{L}\p{N}_-]{1,64}$/u.test(m[1]))
  )
    throw new Error(t("INVALID_INPUT: 模板名称无效"));
  const parsed = new URL(value.replace(/\{[^{}]+\}/g, "parameter"));
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    !parsed.hostname
  )
    throw new Error(t("INVALID_INPUT: 不支持的网址"));
  return value;
}

export function templateFields(url: string): string[] {
  return [
    ...new Set(
      [...normalizeBookmarkUrl(url).matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]),
    ),
  ];
}

export function resolveLaunchUrl(
  url: string,
  values: Record<string, string> = {},
): string {
  const normalized = normalizeBookmarkUrl(url);
  const result = normalized.replace(/\{([^{}]+)\}/g, (_, name: string) => {
    if (
      !Object.hasOwn(values, name) ||
      typeof values[name] !== "string" ||
      !values[name].trim() ||
      values[name].length > 4096
    )
      throw new Error(t("INVALID_INPUT: 请填写全部模板参数"));
    return encodeURIComponent(values[name]);
  });
  normalizeBookmarkUrl(result);
  return result;
}
