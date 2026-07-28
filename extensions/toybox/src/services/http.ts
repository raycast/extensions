import type { RequestModel } from "../models/request";
import type { CookieEntry, ResponseModel } from "../models/response";
import { parseUrl } from "../utils/url";

/**
 * HTTP 请求服务。
 *
 * 基于原生 `fetch` + `AbortController` 实现超时与取消，不引入 axios。
 * 所有错误（非法 URL、超时、DNS/TLS/网络错误、取消）归一为结构化
 * {@link SendResult}，不向调用方抛异常。
 */

/** 发送结果：成功携带响应模型，失败携带错误消息。 */
export type SendResult =
  { readonly ok: true; readonly response: ResponseModel } | { readonly ok: false; readonly error: string };

/**
 * 发送一个 {@link RequestModel} 对应的 HTTP 请求。
 *
 * - 超时由 `AbortController` + `setTimeout` 实现，到时中止请求。
 * - 重定向由 `fetch` 的 `redirect` 选项控制。
 * - 禁用的 Header / FormData 条目会被跳过。
 */
export async function sendRequest(req: RequestModel): Promise<SendResult> {
  if (!parseUrl(req.url)) {
    return { ok: false, error: `非法 URL：${req.url || "（空）"}` };
  }

  const { headers, hasContentType } = buildHeaders(req);
  const { body, autoContentType } = buildBody(req, hasContentType);
  if (autoContentType) {
    headers.set("Content-Type", autoContentType);
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (req.timeout > 0) {
    timeoutId = setTimeout(() => controller.abort(), req.timeout);
  }

  const start = Date.now();
  try {
    const response = await fetch(req.url, {
      method: req.method,
      headers,
      body,
      redirect: req.followRedirect ? "follow" : "manual",
      signal: controller.signal,
    });
    const duration = Date.now() - start;

    const responseHeaders: [string, string][] = [];
    response.headers.forEach((value, key) => {
      responseHeaders.push([key, value]);
    });

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    const size = Buffer.byteLength(text);

    return {
      ok: true,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        cookies: parseCookies(response),
        body: text,
        contentType,
        duration,
        size,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: req.timeout > 0 ? `请求超时（${req.timeout} ms）` : "请求已取消" };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `网络错误：${message}` };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** 构建启用的 Headers，并返回是否已存在 Content-Type。 */
function buildHeaders(req: RequestModel): { headers: Headers; hasContentType: boolean } {
  const headers = new Headers();
  let hasContentType = false;
  for (const h of req.headers) {
    if (h.enabled && h.key.trim() !== "") {
      headers.set(h.key, h.value);
      if (h.key.toLowerCase() === "content-type") hasContentType = true;
    }
  }
  return { headers, hasContentType };
}

/** 根据 BodyType 构建 body；返回需要自动补充的 Content-Type（multipart 除外）。 */
function buildBody(
  req: RequestModel,
  hasContentType: boolean,
): { body: string | FormData | URLSearchParams | undefined; autoContentType: string | null } {
  switch (req.bodyType) {
    case "none":
      return { body: undefined, autoContentType: null };
    case "json":
      return { body: req.body, autoContentType: hasContentType ? null : "application/json" };
    case "raw":
      return { body: req.body, autoContentType: null };
    case "urlencoded": {
      const params = new URLSearchParams();
      for (const f of req.formData) {
        if (f.enabled && f.key.trim() !== "") params.append(f.key, f.value);
      }
      return { body: params.toString(), autoContentType: hasContentType ? null : "application/x-www-form-urlencoded" };
    }
    case "formData": {
      const fd = new FormData();
      for (const f of req.formData) {
        if (f.enabled && f.key.trim() !== "") fd.append(f.key, f.value);
      }
      // multipart 的 Content-Type 由 fetch 自动设置（含 boundary），不要手动设
      return { body: fd, autoContentType: null };
    }
    default:
      return { body: undefined, autoContentType: null };
  }
}

/** 从 Set-Cookie 响应头解析 Cookie 列表。 */
function parseCookies(response: Response): CookieEntry[] {
  const getSetCookie = (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();
  if (!getSetCookie || getSetCookie.length === 0) return [];
  const cookies: CookieEntry[] = [];
  for (const raw of getSetCookie) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) {
      cookies.push({ name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() });
    }
  }
  return cookies;
}
