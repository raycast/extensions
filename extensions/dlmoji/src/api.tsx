/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"
import querystring from "node:querystring"
import CryptoJS from "crypto-js"
import { checkURL, defaultBaiduAppId, defaultBaiduAppSecret, preferences, showErrorToast } from "./utils"
import { getEmojiTransKey } from "./storage"

// baidu app id and secret
const baiduAppId = preferences.baiduAppId.trim().length > 0 ? preferences.baiduAppId.trim() : defaultBaiduAppId
const baiduAppSecret =
    preferences.baiduAppSecret.trim().length > 0 ? preferences.baiduAppSecret.trim() : defaultBaiduAppSecret

// deepmoji url
const deepmojiURL = preferences.deepmojiURL.trim()
if (deepmojiURL.length > 0 && !checkURL(deepmojiURL)) {
    showErrorToast("deepmoji", "invalid URL address")
}

export async function preConnect() {
    const connects = []
    if (preferences.useEmojiTranslate) {
        connects.push(fetchEmojiTrans("_", "en", false))
    }
    if (preferences.useBidirectTranslate) {
        connects.push(fetchBidirectTrans("_", "en", true), fetchBidirectTrans("_", "en", false))
    }
    if (preferences.useEmojiAll) {
        connects.push(fetchEmojiAll("_", "en"))
    }
    return axios.all(connects)
}

export function setAxiosTimeout(seconds = 6) {
    axios.interceptors.request.use((config) => {
        config.timeout = seconds * 1000
        return config
    })
}

/**
 * Baidu Translate API
 * Docs: https://fanyi-api.baidu.com/doc/21
 */
export async function fetchBaiduTrans(queryText: string): Promise<any> {
    const salt = Math.round(new Date().getTime() / 1000)
    const md5Content = baiduAppId + queryText + salt + baiduAppSecret
    const sign = CryptoJS.MD5(md5Content).toString()
    const url = "https://fanyi-api.baidu.com/api/trans/vip/translate"
    const from = "auto"
    const to = "en"
    const encodeQueryText = Buffer.from(queryText, "utf8").toString()
    const params = {
        q: encodeQueryText,
        from: from,
        to: to,
        appid: baiduAppId,
        salt: salt,
        sign: sign,
    }
    return axios.get(url, { params }).catch((err) => {
        showErrorToast("Baidu Translate", err.message)
        return
    })
}

export async function fetchDeepl(queryText: string): Promise<any> {
    return axios.post("[host ip]/translate", {
        text: queryText,
        source_lang: "auto",
        target_lang: "EN",
    })
}

export async function fetchDeepmoji(queryText: string): Promise<any> {
    if (!deepmojiURL) return
    return axios
        .post(deepmojiURL, {
            sentences: [queryText],
        })
        .catch((err) => {
            showErrorToast("Deepmoji Emotion Analysis", err.message)
            return
        })
}

export async function fetchEmojiTransHtml(): Promise<any> {
    return axios.get("https://emojitranslate.com/")
}

export async function fetchBidirectTrans(queryText: string, fromLanguage: string, isEmoji: boolean): Promise<any> {
    const lang = fromLanguage === "zh" ? "zh-hans" : fromLanguage
    const endpoint = isEmoji ? "emoji-to-text" : "text-to-Emoji"
    return axios
        .post(
            `https://www.emojiall.com/${lang}/${endpoint}`,
            querystring.stringify({
                language_code: lang,
                text: queryText,
            }),
            {
                headers: {
                    referer: "https://www.emojiall.com/",
                },
            }
        )
        .catch((err) => {
            showErrorToast("Bidirect Translation", err.message)
            return
        })
}

export async function fetchEmojiTrans(queryText: string, fromLanguage: string, updateKey: boolean): Promise<any> {
    const key = await getEmojiTransKey(updateKey)
    return axios
        .post(
            "https://api.emojitranslate.com/",
            querystring.stringify({
                d: queryText,
                f: fromLanguage,
                t: "emoji",
                o: "ft01-",
                k: key,
            })
        )
        .catch((err) => {
            showErrorToast("Emoji Translation", err.message)
            return
        })
}

export async function fetchEmojiAll(queryText: string, fromLanguage: string): Promise<any> {
    const lang = fromLanguage === "zh" ? "zh-hans" : fromLanguage
    return axios
        .post(
            "https://www.emojiall.com/elasticsearch/getData.php",
            querystring.stringify({
                keywords: queryText,
                lang: lang,
            }),
            {
                headers: {
                    referer: "https://www.emojiall.com/",
                },
            }
        )
        .catch((err) => {
            showErrorToast("EmojiAll", err.message)
            return
        })
}
