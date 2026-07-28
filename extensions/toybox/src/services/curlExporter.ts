import type { RequestModel } from "../models/request";
import type { HeaderEntry, QueryEntry } from "../models/types";

/**
 * 请求导出服务：把内部 {@link RequestModel} 反向生成为 curl / fetch / axios 代码。
 *
 * 这样「Copy curl / Copy fetch / Copy axios」与「Export Curl」始终基于当前
 * （可能已被用户编辑的）请求模型，而非原始剪贴板 curl。
 */

/** 仅返回已启用且 key 非空的 Header 条目。 */
function activeHeaders(headers: readonly HeaderEntry[]): HeaderEntry[] {
  return headers.filter((h) => h.enabled && h.key.trim() !== "");
}

/** 仅返回已启用且 key 非空的 Query 条目。 */
function activeQuery(query: readonly QueryEntry[]): QueryEntry[] {
  return query.filter((q) => q.enabled && q.key.trim() !== "");
}

/** 用单引号包裹字符串，内部单引号转义为 `'\''`。无特殊字符时不加引号。 */
function shellQuote(s: string): string {
  if (s === "") return "''";
  if (/^[A-Za-z0-9_.:/?=&%~-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/** 把 RequestModel 生成为可在终端执行的 curl 命令。 */
export function toCurl(req: RequestModel): string {
  const parts: string[] = ["curl"];

  if (req.method !== "GET") {
    parts.push("-X", req.method);
  }

  for (const header of activeHeaders(req.headers)) {
    parts.push("-H", shellQuote(`${header.key}: ${header.value}`));
  }

  const bodyArg = bodyForCurl(req);
  if (bodyArg) {
    parts.push("-d", shellQuote(bodyArg));
  }

  parts.push(shellQuote(req.url));
  return parts.join(" ");
}

/** 根据 BodyType 生成 curl 的 `-d` 参数内容；无 body 返回 null。 */
function bodyForCurl(req: RequestModel): string | null {
  switch (req.bodyType) {
    case "none":
      return null;
    case "json":
    case "raw":
      return req.body;
    case "formData":
    case "urlencoded": {
      const params = new URLSearchParams();
      for (const entry of activeQuery(req.formData)) {
        params.append(entry.key, entry.value);
      }
      return params.toString();
    }
    default:
      return null;
  }
}

/** 把 RequestModel 生成为 fetch 代码片段。 */
export function toFetchCode(req: RequestModel): string {
  const headers = activeHeaders(req.headers);
  const headerLines = headers.map((h) => `    "${h.key}": ${JSON.stringify(h.value)},`);
  const body = bodyForCode(req);

  const lines: string[] = [`fetch(${JSON.stringify(req.url)}, {`, `  method: ${JSON.stringify(req.method)},`];
  if (headerLines.length > 0) {
    lines.push("  headers: {");
    lines.push(...headerLines);
    lines.push("  },");
  }
  if (body !== null) {
    lines.push(`  body: ${JSON.stringify(body)},`);
  }
  lines.push("});");
  return lines.join("\n");
}

/** 把 RequestModel 生成为 axios 代码片段。 */
export function toAxiosCode(req: RequestModel): string {
  const headers = activeHeaders(req.headers);
  const body = bodyForCode(req);

  const config: string[] = [
    `  method: ${JSON.stringify(req.method.toLowerCase())},`,
    `  url: ${JSON.stringify(req.url)},`,
  ];
  if (headers.length > 0) {
    const headerObj = headers.map((h) => `    ${JSON.stringify(h.key)}: ${JSON.stringify(h.value)},`).join("\n");
    config.push("  headers: {");
    config.push(headerObj);
    config.push("  },");
  }
  if (body !== null) {
    config.push(`  data: ${JSON.stringify(body)},`);
  }
  return `axios({\n${config.join("\n")}\n});`;
}

/** 生成代码片段时使用的 body 字符串；无 body 返回 null。 */
function bodyForCode(req: RequestModel): string | null {
  switch (req.bodyType) {
    case "none":
      return null;
    case "json":
    case "raw":
      return req.body;
    case "formData":
    case "urlencoded": {
      const params = new URLSearchParams();
      for (const entry of activeQuery(req.formData)) {
        params.append(entry.key, entry.value);
      }
      return params.toString();
    }
    default:
      return null;
  }
}
