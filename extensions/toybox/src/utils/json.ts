/**
 * JSON 相关纯函数。
 */

/** 尝试解析 JSON，失败返回 null。 */
export function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 美化 JSON（2 空格缩进）。解析失败时原样返回。 */
export function prettyJson(text: string): string {
  const value = tryParseJson(text);
  if (value === null) return text;
  return JSON.stringify(value, null, 2);
}

/** 判断 Content-Type 是否为 JSON（含 `+json` 如 `application/vnd.api+json`）。 */
export function isJsonContentType(contentType: string): boolean {
  return /application\/json|\+json/i.test(contentType);
}

/** 判断 Content-Type 是否为图片。 */
export function isImageContentType(contentType: string): boolean {
  return /^image\//i.test(contentType);
}

/** 判断 Content-Type 是否为 PDF。 */
export function isPdfContentType(contentType: string): boolean {
  return /application\/pdf/i.test(contentType);
}
