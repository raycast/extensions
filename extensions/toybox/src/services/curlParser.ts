import { createDefaultRequest, type RequestModel } from "../models/request";
import type { FormEntry, HeaderEntry, HttpMethod } from "../models/types";
import { buildQueryString, parseQueryString } from "../utils/query";
import { getQueryString, setQueryString } from "../utils/url";
import { isJsonContentType } from "../utils/json";

/**
 * curl 解析服务。
 *
 * **设计说明**：需求首选 `curlconverter`，但它依赖原生模块 `tree-sitter-bash`
 *（.node 文件），Raycast 的 esbuild 打包环境无法内联原生模块，运行时也无
 * `node_modules` 可加载 `external` 包，因此在 Raycast 中不可用。故改为自实现
 * 一个纯 JS 的 shell tokenizer + curl 选项解析器，覆盖需求要求的
 * GET/POST/PUT/DELETE/PATCH、Cookie、Header、Body（JSON/FormData/multipart）、
 * Basic Auth、Bearer、Query。
 *
 * tokenizer 处理单引号 / 双引号 / 反斜杠转义 / 行尾续行，能正确拆分大多数
 * 真实 curl 命令；命令替换（`$(...)`）等动态语法按字面量处理。
 */

/** curl 解析结果：成功携带请求模型，失败携带错误消息。 */
export type CurlParseResult =
  { readonly ok: true; readonly request: RequestModel } | { readonly ok: false; readonly error: string };

/** 判断文本是否像 curl 命令（以 `curl` 开头）。 */
export function looksLikeCurl(text: string): boolean {
  return text.trim().toLowerCase().startsWith("curl ");
}

/**
 * 把 curl 字符串解析为 {@link RequestModel}。
 *
 * 解析失败（如没有 URL）时返回结构化错误，不抛异常。
 */
export function parseCurl(curlString: string): CurlParseResult {
  const tokens = tokenize(curlString);
  if (tokens.length === 0) {
    return { ok: false, error: "无法解析 curl 命令：未识别到任何参数。" };
  }
  const request = parseTokens(tokens);
  if (!request.url) {
    return { ok: false, error: "无法解析 curl 命令：未找到 URL。" };
  }
  return { ok: true, request };
}

/**
 * Shell tokenizer：把 curl 命令字符串拆分为参数数组。
 *
 * - 单引号内：原样保留，不转义；
 * - 双引号内：处理 `\"` `\\` `\$` `` \` `` 转义，其余原样；
 * - 反斜杠：转义下一字符；行尾 `\` + 换行为续行；
 * - 空白字符分隔参数。
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
      } else {
        current += ch;
      }
      i += 1;
      continue;
    }

    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
      } else if (ch === "\\") {
        const next = input[i + 1];
        if (next === '"' || next === "\\" || next === "$" || next === "`") {
          current += next;
          i += 2;
          continue;
        }
        current += ch;
      } else {
        current += ch;
      }
      i += 1;
      continue;
    }

    if (ch === "\\") {
      const next = input[i + 1];
      if (next === "\n") {
        i += 2;
        continue;
      }
      if (next !== undefined) {
        current += next;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      i += 1;
      continue;
    }

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (current !== "") {
        tokens.push(current);
        current = "";
      }
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  if (current !== "") {
    tokens.push(current);
  }

  return tokens;
}

/** 已知的不带值参数（布尔开关），解析时直接跳过。 */
const FLAG_OPTIONS = new Set([
  "--compressed",
  "-k",
  "--insecure",
  "-s",
  "--silent",
  "-S",
  "--show-error",
  "-i",
  "--include",
  "-v",
  "--verbose",
  "-G",
  "--get",
  "--location",
  "-L",
  "-f",
  "--fail",
  "-N",
  "--no-buffer",
]);

/** 带值参数 -> 其值是否为 body（用于 -d 系列与 -G 配合时的 query 转换）。 */
const DATA_OPTIONS = new Set(["-d", "--data", "--data-raw", "--data-binary", "--data-ascii", "--data-urlencode"]);

/** 把 token 数组解析为 RequestModel。 */
function parseTokens(tokens: string[]): RequestModel {
  const request = createDefaultRequest();
  const headers: HeaderEntry[] = [];
  const formData: FormEntry[] = [];
  let body = "";
  let hasBody = false;
  let useGet = false;
  let basicAuth: { user: string; pass: string } | null = null;

  // 跳过开头的 curl（可能是 /usr/bin/curl 等）
  let i = 0;
  if (tokens.length > 0 && /(^|\/)curl(\.exe)?$/.test(tokens[0])) {
    i = 1;
  }

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok === "-X" || tok === "--request") {
      request.method = (tokens[i + 1] ?? "GET").toUpperCase() as HttpMethod;
      i += 2;
      continue;
    }

    if (tok === "-H" || tok === "--header") {
      const raw = tokens[i + 1] ?? "";
      const colon = raw.indexOf(":");
      if (colon > 0) {
        const key = raw.slice(0, colon).trim();
        const value = raw.slice(colon + 1).trim();
        headers.push({ key, value, enabled: value !== "" });
      }
      i += 2;
      continue;
    }

    if (DATA_OPTIONS.has(tok)) {
      body = tokens[i + 1] ?? "";
      hasBody = true;
      if (request.method === "GET") request.method = "POST";
      i += 2;
      continue;
    }

    if (tok === "-F" || tok === "--form") {
      const raw = tokens[i + 1] ?? "";
      const eq = raw.indexOf("=");
      formData.push({ key: eq > 0 ? raw.slice(0, eq) : raw, value: eq >= 0 ? raw.slice(eq + 1) : "", enabled: true });
      if (request.method === "GET") request.method = "POST";
      i += 2;
      continue;
    }

    if (tok === "-u" || tok === "--user") {
      const cred = tokens[i + 1] ?? "";
      const colon = cred.indexOf(":");
      basicAuth = { user: colon > 0 ? cred.slice(0, colon) : cred, pass: colon > 0 ? cred.slice(colon + 1) : "" };
      i += 2;
      continue;
    }

    if (tok === "-b" || tok === "--cookie") {
      const cookie = tokens[i + 1] ?? "";
      headers.push({ key: "Cookie", value: cookie, enabled: true });
      i += 2;
      continue;
    }

    if (tok === "-G" || tok === "--get") {
      useGet = true;
      i += 1;
      continue;
    }

    if (tok === "--url") {
      request.url = tokens[i + 1] ?? "";
      i += 2;
      continue;
    }

    if (tok === "--location" || tok === "-L") {
      request.followRedirect = true;
      i += 1;
      continue;
    }

    if (FLAG_OPTIONS.has(tok)) {
      i += 1;
      continue;
    }

    // 形如 --max-time=10 的带等号长选项
    if (tok.startsWith("--") && tok.includes("=")) {
      i += 1;
      continue;
    }

    // 非 option 参数视为 URL（取第一个）
    if (!tok.startsWith("-") && !request.url) {
      request.url = tok;
    }
    i += 1;
  }

  // -G：把 body 数据转为 query
  if (useGet) {
    request.method = "GET";
    if (hasBody && body) {
      const qs = body.startsWith("?") ? body.slice(1) : body;
      request.url = setQueryString(request.url, qs) || request.url;
      hasBody = false;
      body = "";
    }
  }

  // 推断 BodyType
  const contentType = findHeader(headers, "Content-Type");
  if (formData.length > 0) {
    request.bodyType = "formData";
    request.formData = formData;
  } else if (hasBody) {
    if (isJsonContentType(contentType)) {
      request.bodyType = "json";
      request.body = body;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      request.bodyType = "urlencoded";
      request.formData = parseQueryString(body);
    } else {
      request.bodyType = "raw";
      request.body = body;
    }
  }

  // Basic Auth 转 Authorization header
  if (basicAuth) {
    headers.push({
      key: "Authorization",
      value: `Basic ${btoa(`${basicAuth.user}:${basicAuth.pass}`)}`,
      enabled: true,
    });
  }

  // Query 与 URL 同步
  request.headers = headers;
  request.query = parseQueryString(getQueryString(request.url));
  if (request.query.length > 0) {
    request.url = setQueryString(request.url, buildQueryString(request.query)) || request.url;
  }

  return request;
}

/** 在 HeaderEntry[] 中查找指定 header（大小写不敏感），返回其值。 */
function findHeader(headers: readonly HeaderEntry[], name: string): string {
  const lower = name.toLowerCase();
  for (const entry of headers) {
    if (entry.key.toLowerCase() === lower) return entry.value;
  }
  return "";
}
