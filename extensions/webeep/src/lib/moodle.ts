import { AuthError, clearStoredToken, getToken, SESSION_EXPIRED_MESSAGE } from "./auth";
import { WS_ENDPOINT } from "./constants";

export type WsValue = string | number | boolean | WsValue[] | { [key: string]: WsValue };
export type WsParams = Record<string, WsValue>;

interface WsError {
  exception: string;
  errorcode: string;
  message: string;
}

/** Flattens nested params into Moodle's PHP-style form encoding (`courseids[0]=1`, `courses[0][id]=2`). */
export function encodeParams(params: WsParams, target = new URLSearchParams(), prefix = ""): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => appendValue(target, `${name}[${index}]`, item));
    } else {
      appendValue(target, name, value);
    }
  }
  return target;
}

function appendValue(target: URLSearchParams, name: string, value: WsValue): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendValue(target, `${name}[${index}]`, item));
  } else if (typeof value === "object" && value !== null) {
    encodeParams(value, target, name);
  } else if (typeof value === "boolean") {
    target.append(name, value ? "1" : "0");
  } else {
    target.append(name, String(value));
  }
}

export function isWsError(data: unknown): data is WsError {
  return typeof data === "object" && data !== null && "exception" in data && "errorcode" in data;
}

/** Calls a Moodle web service function through the REST protocol. */
export async function callWs<T>(
  wsfunction: string,
  params: WsParams = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const token = await getToken();
  const query = new URLSearchParams({ moodlewsrestformat: "json", wstoken: token, wsfunction });
  const response = await fetchImpl(`${WS_ENDPOINT}?${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: encodeParams(params).toString(),
  });
  if (!response.ok) throw new Error(`WeBeep responded with HTTP ${response.status} for ${wsfunction}`);
  const data: unknown = await response.json();
  if (isWsError(data)) {
    if (data.errorcode === "invalidtoken" || data.errorcode === "accessexception") {
      await clearStoredToken();
      throw new AuthError(`WeBeep rejected the access token. ${SESSION_EXPIRED_MESSAGE}`);
    }
    throw new Error(data.message || data.errorcode);
  }
  return data as T;
}

/** Appends the web service token to a `webservice/pluginfile.php` URL so it can be downloaded without a browser session. */
export function withToken(fileUrl: string, token: string): string {
  const url = new URL(fileUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

/** Turns a `webservice/pluginfile.php` URL into the regular browser URL (works with the logged-in browser session). */
export function browserFileUrl(fileUrl: string): string {
  const url = new URL(fileUrl);
  url.pathname = url.pathname.replace(/^\/webservice\/pluginfile\.php/, "/pluginfile.php");
  url.searchParams.delete("forcedownload");
  url.searchParams.delete("token");
  return url.toString();
}
