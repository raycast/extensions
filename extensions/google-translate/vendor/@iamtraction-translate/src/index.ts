/**
 * Source https://github.com/iamtraction/google-translate
 * MIT License
 */
import querystring from "querystring";
import { TranslateOption, TranslateResponse } from "./types";
import { isSupported, getISOCode } from "./languages";

const TRANSLATE_URL = "https://translate.google.com/translate_a/single";
const MAX_GET_URL_LENGTH = 2048;
const CACHE_LIMIT = 64;

// Recent responses, and requests already on the wire. Translating the same
// text to several places (or re-rendering a view) should not hit the network again.
const bodyCache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(text: string, from: string, to: string, proxy?: string) {
    return `${from}\n${to}\n${proxy ?? ""}\n${text}`;
}

function readCache(key: string): unknown | undefined {
    if (!bodyCache.has(key)) return undefined;
    const hit = bodyCache.get(key);
    bodyCache.delete(key);
    bodyCache.set(key, hit);
    return hit;
}

function writeCache(key: string, body: unknown) {
    bodyCache.delete(key);
    bodyCache.set(key, body);
    if (bodyCache.size <= CACHE_LIMIT) return;
    const oldest = bodyCache.keys().next().value;
    if (oldest !== undefined) bodyCache.delete(oldest);
}

function failedRequest(status: number): Error {
    if (status === 429) {
        const error = new Error("please try again later");
        error.name = "TooManyRequestsError";
        return error;
    }
    const error = new Error(`Translation request failed (${status})`);
    error.name = "TranslateError";
    return error;
}

/**
 * dict-chrome-ex accepts a translation without a `tk` token. The previous
 * client fetched the whole translate.google.com document (several megabytes,
 * and it no longer contains a token) before every request, then asked for
 * dictionary, examples, and definitions that the extension never reads.
 * `dt=t` is the translation and `dt=rm` is the pronunciation.
 */
async function requestTranslation(text: string, from: string, to: string, proxy?: string): Promise<unknown> {
    const key = cacheKey(text, from, to, proxy);
    const cached = readCache(key);
    if (cached !== undefined) return cached;

    const pending = inflight.get(key);
    if (pending) return pending;

    const request = fetchTranslation(text, from, to, proxy)
        .then((body) => {
            writeCache(key, body);
            return body;
        })
        .finally(() => {
            inflight.delete(key);
        });

    inflight.set(key, request);
    return request;
}

async function fetchTranslation(text: string, from: string, to: string, proxy?: string): Promise<unknown> {
    const data: Record<string, string | string[]> = {
        client: "dict-chrome-ex",
        sl: from,
        tl: to,
        dt: ["t", "rm"],
        ie: "UTF-8",
        oe: "UTF-8",
        q: text,
    };

    let url = `${TRANSLATE_URL}?${querystring.stringify(data)}`;
    let method: "GET" | "POST" = "GET";
    let requestBody: string | undefined;
    const headers: Record<string, string> = {};

    if (url.length > MAX_GET_URL_LENGTH) {
        delete data.q;
        url = `${TRANSLATE_URL}?${querystring.stringify(data)}`;
        method = "POST";
        requestBody = new URLSearchParams({ q: text }).toString();
        headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
    }

    let status: number;
    let body: unknown;
    if (proxy) {
        const undici = (await import("undici")).default;
        const { request, ProxyAgent } = undici as typeof undici & Pick<typeof import("undici"), "ProxyAgent">;
        const response = await request(url, {
            method,
            body: requestBody,
            headers,
            dispatcher: new ProxyAgent(proxy),
        });
        status = response.statusCode;
        body = status === 200 ? await response.body.json() : undefined;
    } else {
        const response = await fetch(url, { method, body: requestBody, headers });
        status = response.status;
        body = status === 200 ? await response.json() : undefined;
    }

    if (status !== 200 || !Array.isArray(body) || !Array.isArray(body[0])) {
        throw failedRequest(status);
    }

    return body;
}

/**
 * @function translate
 * @param {String} text The text to be translated.
 * @param {TranslateOption} options The options object for the translator.
 * @returns {TranslateResponse} The result containing the translation.
 */
export async function translate(text: string, options?: TranslateOption): Promise<TranslateResponse> {
    if (typeof options !== "object") options = {};
    text = String(text);

    // Check if a lanugage is in supported; if not, throw an error object.
    let error: Error | null = null;
    [ options.from, options.to ].forEach((lang) => {
        if (lang && !isSupported(lang)) {
            error = new Error();
            error.message = `The language '${lang}' is not supported.`;
        }
    });
    if (error) throw error;

    // If options object doesn"t have "from" language, set it to "auto".
    if (!Object.prototype.hasOwnProperty.call(options, "from")) options.from = "auto";
    // If options object doesn"t have "to" language, set it to "en".
    if (!Object.prototype.hasOwnProperty.call(options, "to")) options.to = "en";
    // If options object has a "raw" property evaluating to true, set it to true.
    options.raw = Boolean(options.raw);

    // Get ISO 639-1 codes for the languages.
    options.from = getISOCode(options.from) || "auto";
    options.to = getISOCode(options.to) || "en";

    const body: any = await requestTranslation(text, options.from, options.to, options.proxy);

    let result: TranslateResponse = {
        text: "",
        from: {
            language: {
                didYouMean: false,
                iso: ""
            },
            text: {
                autoCorrected: false,
                value: "",
                didYouMean: false
            }
        },
        raw: ""
    };

    // If user requested a raw output, add the raw response to the result
    if (options.raw) {
        result.raw = body;
    }

    // Parse body and add it to the result object.
    body[0].forEach((obj: any) => {
        if (obj[0]) {
            result.text += obj[0];
        }
    });

    const detected = body[2];
    const suggested = body[8]?.[0]?.[0];
    if (suggested && detected !== suggested) {
        result.from.language.didYouMean = true;
        result.from.language.iso = suggested;
    }
    else {
        result.from.language.iso = detected || "";
    }

    if (body[7] && body[7][0]) {
        let str = body[7][0];

        str = str.replace(/<b><i>/g, "[");
        str = str.replace(/<\/i><\/b>/g, "]");

        result.from.text.value = str;

        if (body[7][5] === true) {
            result.from.text.autoCorrected = true;
        }
        else {
            result.from.text.didYouMean = true;
        }
    }

    return result;
}
