import crypto from "node:crypto";
import { CryptoConfig } from "./config/config.js";
import { XsCommonSigner } from "./core/commonSign.js";
import { CryptoProcessor } from "./core/crypto.js";
import { RandomGenerator } from "./utils/randomGen.js";
import { buildUrl, extractUri } from "./utils/urlUtils.js";
import { RequestSignatureValidator } from "./utils/validators.js";

export type Payload = Record<string, unknown> | undefined;

export class SignUtil {
  readonly config: CryptoConfig;
  readonly cryptoProcessor: CryptoProcessor;
  readonly randomGenerator: RandomGenerator;

  constructor(config: CryptoConfig | null = null) {
    this.config = config ?? new CryptoConfig();
    this.cryptoProcessor = new CryptoProcessor(this.config);
    this.randomGenerator = new RandomGenerator(this.config);
  }

  private buildContentString(method: "GET" | "POST", uri: string, payload: Payload = undefined): string {
    const data = payload ?? {};
    if (method === "POST") {
      return uri + JSON.stringify(data);
    }

    if (!payload || Object.keys(payload).length === 0) {
      return uri;
    }

    const params = Object.entries(data).map(([key, value]) => {
      let formatted: string;
      if (Array.isArray(value)) {
        formatted = value.map((v) => String(v)).join(",");
      } else if (value === null || value === undefined) {
        formatted = "";
      } else {
        formatted = String(value);
      }
      const encoded = formatted.replace(/=/g, "%3D");
      return `${key}=${encoded}`;
    });

    return `${uri}?${params.join("&")}`;
  }

  private generateDValue(content: string): string {
    return crypto.createHash("md5").update(content, "utf8").digest("hex");
  }

  private buildSignature(
    dValue: string,
    a1Value: string,
    xsecAppid = "xhs-pc-web",
    stringParam = "",
    timestamp: number | null = null,
  ): string {
    const payloadArray = this.cryptoProcessor.buildPayloadArray(dValue, a1Value, xsecAppid, stringParam, timestamp);

    const xorResult = this.cryptoProcessor.bitOps.xorTransformArray(payloadArray);
    return this.cryptoProcessor.b64encoder.encodeX3(xorResult.slice(0, 124));
  }

  signXs(
    method: "GET" | "POST",
    uri: string,
    a1Value: string,
    xsecAppid = "xhs-pc-web",
    payload: Payload = undefined,
    timestamp: number | null = null,
  ): string {
    const validator = RequestSignatureValidator;
    const validatedMethod = validator.validateMethod(method);
    const validatedUri = validator.validateUri(uri);
    const validatedA1 = validator.validateA1Value(a1Value);
    const validatedAppid = validator.validateXsecAppId(xsecAppid);
    const validatedPayload = validator.validatePayload(payload);

    const normalizedUri = extractUri(validatedUri);
    const signatureData = { ...this.cryptoProcessor.config.SIGNATURE_DATA_TEMPLATE } as Record<string, unknown>;

    const contentString = this.buildContentString(validatedMethod, normalizedUri, validatedPayload);

    const dValue = this.generateDValue(contentString);
    signatureData["x3"] =
      this.cryptoProcessor.config.X3_PREFIX +
      this.buildSignature(dValue, validatedA1, validatedAppid, contentString, timestamp);

    const encoded = this.cryptoProcessor.b64encoder.encode(JSON.stringify(signatureData));
    return this.cryptoProcessor.config.XYS_PREFIX + encoded;
  }

  signXsCommon(cookieDict: Record<string, unknown> | string): string {
    const parsed = this.parseCookies(cookieDict);
    const signer = new XsCommonSigner(this.config);
    return signer.sign(parsed);
  }

  signXsGet(
    uri: string,
    a1Value: string,
    xsecAppid = "xhs-pc-web",
    params: Payload = undefined,
    timestamp: number | null = null,
  ): string {
    return this.signXs("GET", uri, a1Value, xsecAppid, params, timestamp);
  }

  signXsPost(
    uri: string,
    a1Value: string,
    xsecAppid = "xhs-pc-web",
    payload: Payload = undefined,
    timestamp: number | null = null,
  ): string {
    return this.signXs("POST", uri, a1Value, xsecAppid, payload, timestamp);
  }

  signXsc(cookieDict: Record<string, unknown> | string): string {
    return this.signXsCommon(cookieDict);
  }

  decodeX3(x3Signature: string): Uint8Array {
    const sig = x3Signature.startsWith(this.config.X3_PREFIX)
      ? x3Signature.slice(this.config.X3_PREFIX.length)
      : x3Signature;

    const decoded = this.cryptoProcessor.b64encoder.decodeX3(sig);
    return this.cryptoProcessor.bitOps.xorTransformArray(Array.from(decoded));
  }

  decodeXs(xsSignature: string): Record<string, unknown> {
    const sig = xsSignature.startsWith(this.config.XYS_PREFIX)
      ? xsSignature.slice(this.config.XYS_PREFIX.length)
      : xsSignature;

    const jsonString = this.cryptoProcessor.b64encoder.decode(sig);
    try {
      return JSON.parse(jsonString) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`Invalid signature: JSON decode failed - ${error}`);
    }
  }

  buildUrl(baseUrl: string, params: Record<string, unknown> | null = null): string {
    return buildUrl(baseUrl, params);
  }

  buildJsonBody(payload: Record<string, unknown>): string {
    return JSON.stringify(payload);
  }

  getB3TraceId(): string {
    return this.randomGenerator.generateB3TraceId();
  }

  getXrayTraceId(timestamp?: number, seq?: number): string {
    return this.randomGenerator.generateXrayTraceId(timestamp, seq);
  }

  getXT(timestamp?: number): number {
    const ts = typeof timestamp === "number" ? timestamp : Date.now() / 1000;
    return Math.trunc(ts * 1000);
  }

  private parseCookies(cookies: Record<string, unknown> | string): Record<string, unknown> {
    if (typeof cookies === "string") {
      const result: Record<string, unknown> = {};
      if (!cookies.trim()) return result;
      for (const part of cookies.split(";")) {
        const piece = part.trim();
        if (!piece) continue;
        const [rawKey, ...rest] = piece.split("=");
        if (!rawKey) continue;
        const value = rest.join("=").trim();
        result[rawKey.trim()] = value.replace(/^"|"$/g, "");
      }
      return result;
    }
    return cookies;
  }

  signHeaders(
    method: "GET" | "POST",
    uri: string,
    cookies: Record<string, unknown> | string,
    xsecAppid = "xhs-pc-web",
    params: Payload = undefined,
    payload: Payload = undefined,
    timestamp: number | null = null,
  ): Record<string, string> {
    const ts = timestamp ?? Date.now() / 1000;
    const methodUpper = method.toUpperCase() as "GET" | "POST";

    let requestData: Payload;
    if (methodUpper === "GET") {
      if (payload !== undefined && payload !== null) {
        throw new Error("GET requests must use 'params', not 'payload'");
      }
      requestData = params;
    } else if (methodUpper === "POST") {
      if (params !== undefined && params !== null) {
        throw new Error("POST requests must use 'payload', not 'params'");
      }
      requestData = payload;
    } else {
      throw new Error(`Unsupported method: ${method}`);
    }

    const cookieDict = this.parseCookies(cookies);
    const a1Value = cookieDict["a1"];
    if (!a1Value || typeof a1Value !== "string") {
      throw new Error("Missing 'a1' in cookies");
    }

    const xS = this.signXs(methodUpper, uri, a1Value, xsecAppid, requestData, ts);
    const xSCommon = this.signXsCommon(cookieDict);
    const xT = this.getXT(ts);
    const xB3TraceId = this.getB3TraceId();
    const xXrayTraceId = this.getXrayTraceId(Math.trunc(ts * 1000));

    return {
      "x-s": xS,
      "x-s-common": xSCommon,
      "x-t": String(xT),
      "x-b3-traceid": xB3TraceId,
      "x-xray-traceid": xXrayTraceId,
    };
  }

  signHeadersGet(
    uri: string,
    cookies: Record<string, unknown> | string,
    xsecAppid = "xhs-pc-web",
    params: Payload = undefined,
    timestamp: number | null = null,
  ): Record<string, string> {
    return this.signHeaders("GET", uri, cookies, xsecAppid, params, undefined, timestamp);
  }

  signHeadersPost(
    uri: string,
    cookies: Record<string, unknown> | string,
    xsecAppid = "xhs-pc-web",
    payload: Payload = undefined,
    timestamp: number | null = null,
  ): Record<string, string> {
    return this.signHeaders("POST", uri, cookies, xsecAppid, undefined, payload, timestamp);
  }
}
