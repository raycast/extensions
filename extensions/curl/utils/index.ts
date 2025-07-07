import { Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface HeaderKey {
  [key: string]: string | number;
}

interface Header extends HeaderKey {
  key: string;
  value: string;
}

export interface Parameter {
  key: string;
  value: string;
  enabled: boolean;
}

export const methods: string[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export const methodColors = {
  GET: Color.Green,
  DELETE: Color.Red,
  PATCH: Color.Orange,
  POST: Color.Yellow,
  PUT: Color.Purple,
};

export const headerKeys: string[] = [
  "A-IM",
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Accept-Datetime",
  "Access-Control-Request-Method",
  "Access-Control-Request-Headers",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "Date",
  "Expect",
  "Forwarded",
  "From",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "If-Range",
  "If-Unmodified-Since",
  "Max-Forwards",
  "Origin",
  "Pragma",
  "Proxy-Authorization",
  "Range",
  "Referer",
  "TE",
  "User-Agent",
  "Upgrade",
  "Via",
  "Warning",
  "Dnt",
  "X-Requested-With",
  "X-CSRF-Token",
];

export function makeObject(array: Header[]) {
  return array.reduce((obj: object, item: Header) => Object.assign(obj, { [item.key]: item.value }), {});
}

export function extractParametersFromUrl(urlString: string): Parameter[] {
  try {
    const queryMatch = urlString.match(/\?(.+)$/);
    if (!queryMatch) return [];

    const queryString = queryMatch[1];
    const params: Parameter[] = [];

    const rawParams = queryString.split("&").filter((p) => p !== "");

    rawParams.forEach((param) => {
      if (param.includes("=")) {
        const equalIndex = param.indexOf("=");
        const key = param.substring(0, equalIndex);
        const value = param.substring(equalIndex + 1);

        params.push({
          key: decodeURIComponent(key),
          value: decodeURIComponent(value),
          enabled: true,
        });
      } else {
        params.push({
          key: decodeURIComponent(param),
          value: "",
          enabled: true,
        });
      }
    });

    return params;
  } catch (e) {
    showFailureToast(e, { title: "Failed to parse URL parameters" });
    return [];
  }
};

export function buildUrlFromParameters(baseUrl: string, params: Parameter[]) {
  try {
    const baseUrlOnly = baseUrl.split("?")[0];
    const enabledParams = params.filter((param) => param.enabled);

    if (enabledParams.length === 0) {
      return baseUrlOnly;
    }

    const queryParts: string[] = [];

    enabledParams.forEach((param) => {
      const key = param.key.trim();
      const value = param.value.trim();

      if (key && value) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      } else if (key && !value) {
        queryParts.push(encodeURIComponent(key));
      } else if (!key && value) {
        queryParts.push(`=${encodeURIComponent(value)}`);
      }
    });

    return queryParts.length > 0 ? `${baseUrlOnly}?${queryParts.join("&")}` : baseUrlOnly;
  } catch (e) {
    return baseUrl;
  }
};