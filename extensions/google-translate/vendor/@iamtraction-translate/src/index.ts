/**
 * Source https://github.com/iamtraction/google-translate
 * MIT License
 */
import querystring from "querystring";
import { TranslateOption, TranslateResponse } from "./types";
import { isSupported, getISOCode } from "./languages";
import { tokenGenerator } from "./tokenGenerator";

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
    options.from = getISOCode(options.from);
    options.to = getISOCode(options.to);

    // Generate Google Translate token for the text to be translated.
    let token: any = await tokenGenerator(text);

    // URL & query string required by Google Translate.
    let baseUrl = "https://translate.google.com/translate_a/single";
    let data: any = {
        client: "dict-chrome-ex",
        sl: options.from,
        tl: options.to,
        hl: options.to,
        dt: [ "at", "bd", "ex", "ld", "md", "qca", "rw", "rm", "ss", "t" ],
        ie: "UTF-8",
        oe: "UTF-8",
        otf: 1,
        ssel: 0,
        tsel: 0,
        kc: 7,
        q: text,
        [token.name]: token.value
    };

    // Append query string to the request URL.
    let url = `${baseUrl}?${querystring.stringify(data)}`;

    let requestUrl = url;
    let method: "GET" | "POST" = "GET";
    let requestBody: string | undefined;
    const headers: Record<string, string> = {};
    // If request URL is greater than 2048 characters, use POST method.
    if (url.length > 2048) {
        delete data.q;
        requestUrl = `${baseUrl}?${querystring.stringify(data)}`;
        method = "POST";
        requestBody = new URLSearchParams({ q: text }).toString();
        headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
    }

    // Use the platform's built-in fetch. undici is loaded lazily and only when a
    // proxy is configured, so the common path never pulls it in.
    let body: any;
    if (options.proxy) {
        // Global fetch stays the default; only the proxy path pulls in undici, and it
        // uses undici's own request() (not an imported fetch) so a dispatcher can be set.
        const { request, ProxyAgent } = await import("undici");
        const response = await request(requestUrl, {
            method,
            body: requestBody,
            headers,
            dispatcher: new ProxyAgent(options.proxy),
        });
        body = await response.body.json();
    } else {
        const response = await fetch(requestUrl, { method, body: requestBody, headers });
        body = await response.json();
    }

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

    if (body[2] === body[8][0][0]) {
        result.from.language.iso = body[2];
    }
    else {
        result.from.language.didYouMean = true;
        result.from.language.iso = body[8][0][0];
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
