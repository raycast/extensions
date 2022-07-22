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
        connects.push(
            getEmojiTransKey(false).then((key) => {
                fetchEmojiTrans("", "en", key)
            })
        )
    }
    if (preferences.useVerbatimTranslate) {
        connects.push(fetchChineseEmojiTrans(""))
    }
    if (preferences.useEmojiAll) {
        connects.push(fetchEmojiAll("", "en"))
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
 * 百度翻译API
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
    return axios.post(deepmojiURL, {
        sentences: [queryText],
    })
}

export async function fetchEmojiTransHtml(): Promise<any> {
    return axios.get("https://emojitranslate.com/")
}

export async function fetchChineseEmojiTrans(queryText: string): Promise<any> {
    const text = encodeURIComponent(queryText)
    return axios.get("https://zhongwenzidian.18dao.cn/to-emoji/" + text).catch((err) => {
        showErrorToast("18dao Verbatim Chinese Translate", err.message)
        return
    })
}

export async function fetchEmojiTrans(queryText: string, fromLanguage: string, key: string): Promise<any> {
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

    // let data = new FormData();
    // data.append('keywords', queryText)
    // data.append('lang', lang)

    return axios
        .post(
            "https://www.emojiall.com/elasticsearch/getData.php",
            querystring.stringify({
                keywords: queryText,
                lang: lang,
            }),
            {
                headers: {
                    // 'Content-Type': 'multipart/form-data',
                    referer: "https://www.emojiall.com/",
                },
            }
        )
        .catch((err) => {
            showErrorToast("EmojiAll", err.message)
            return
        })
}
