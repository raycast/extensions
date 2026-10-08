/**
 * Source https://github.com/iamtraction/google-translate
 * MIT License
 */

export interface TranslateOption {
    /** The language name/ISO 639-1 code to translate from. If none is given, it will auto detect the source language. */
    from?: string;
    /** The language name/ISO 639-1 code to translate to. If none is given, it will translate to English. */
    to?: string;
    /** If `true`, it will return the raw output that was received from Google Translate. */
    raw?: boolean;
    /** If set, it will use the proxy for Google Translate. */
    proxy?: string;
}

export interface TranslateResponse {
    /** The translated text */
    text: string;
    from: {
        language: {
            /** Whether or not the API suggest a correction in the source language. */
            didYouMean: boolean;
            /** The ISO 639-1 code of the language that the API has recognized in the text. */
            iso: string;
        };
        text: {
            /** Whether or not the API has auto corrected the original text. */
            autoCorrected: boolean;
            /** The auto corrected text or the text with suggested corrections. Only returned if `from.text.autoCorrected` or `from.text.didYouMean` is `true`. */
            value: string;
            /** Wherether or not the API has suggested corrections to the text. */
            didYouMean: boolean;
        };
    };
    /** The raw response from Google Translate servers. Only returned if `options.raw` is `true` in the request options. */
    raw: string;
}
