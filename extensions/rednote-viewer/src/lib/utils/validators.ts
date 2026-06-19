export type HttpMethod = "GET" | "POST";

export class RequestSignatureValidator {
  static validateMethod(method: unknown): HttpMethod {
    if (typeof method !== "string") {
      throw new TypeError(`method must be str, got ${typeof method}`);
    }

    const normalized = method.trim().toUpperCase();
    if (normalized !== "GET" && normalized !== "POST") {
      throw new Error(`method must be 'GET' or 'POST', got '${normalized}'`);
    }
    return normalized;
  }

  static validateUri(uri: unknown): string {
    if (typeof uri !== "string") {
      throw new TypeError(`uri must be str, got ${typeof uri}`);
    }
    if (!uri.trim()) {
      throw new Error("uri cannot be empty");
    }
    return uri.trim();
  }

  static validateA1Value(a1Value: unknown): string {
    if (typeof a1Value !== "string") {
      throw new TypeError(`a1_value must be str, got ${typeof a1Value}`);
    }
    if (!a1Value.trim()) {
      throw new Error("a1_value cannot be empty");
    }
    return a1Value.trim();
  }

  static validateXsecAppId(xsecAppid: unknown): string {
    if (typeof xsecAppid !== "string") {
      throw new TypeError(`xsec_appid must be str, got ${typeof xsecAppid}`);
    }
    if (!xsecAppid.trim()) {
      throw new Error("xsec_appid cannot be empty");
    }
    return xsecAppid.trim();
  }

  static validatePayload(payload: unknown): Record<string, unknown> | undefined {
    if (payload === null || payload === undefined) {
      return undefined;
    }
    if (typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError(`payload must be dict or None, got ${typeof payload}`);
    }
    for (const key of Object.keys(payload as Record<string, unknown>)) {
      if (typeof key !== "string") {
        throw new TypeError("payload keys must be str");
      }
    }
    return payload as Record<string, unknown>;
  }

  static validateCookie(cookie: unknown): Record<string, unknown> | string | undefined {
    if (cookie === null || cookie === undefined) {
      return undefined;
    }
    if (typeof cookie === "string") {
      return cookie;
    }
    if (typeof cookie === "object" && !Array.isArray(cookie)) {
      for (const key of Object.keys(cookie as Record<string, unknown>)) {
        if (typeof key !== "string") {
          throw new TypeError("payload keys must be str");
        }
      }
      return cookie as Record<string, unknown>;
    }
    throw new TypeError(`payload must be dict or None, got ${typeof cookie}`);
  }
}
