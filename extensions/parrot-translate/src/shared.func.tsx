import axios from "axios"
import crypto from "crypto"
import querystring from "node:querystring"
import { getPreferenceValues } from "@raycast/api"
import { COPY_TYPE, LANGUAGE_LIST } from "./consts"

import {
    ILanguageListItem,
    IPreferences,
    IReformatTranslateResult,
    ITranslateReformatResult,
    ITranslateResult,
} from "./types"

export function truncate(string: string, length = 16, separator = "..") {
    if (string.length <= length) return string

    return string.substring(0, length) + separator
}

export function getItemFromLanguageList(value: string): ILanguageListItem {
    for (const langItem of LANGUAGE_LIST) {
        if (langItem.languageId === value) {
            return langItem
        }
    }

    return {
        languageId: "",
        languageTitle: "",
        languageVoice: [""],
    }
}

export function reformatCopyTextArray(data: string[], limitResultAmount = 10): IReformatTranslateResult[] {
    const dataLength = data?.length - 1
    let finalData: string[] = data
    if (limitResultAmount > 0 && dataLength >= limitResultAmount) {
        finalData = data.slice(0, limitResultAmount - 1)
        finalData.push(data[dataLength])
    }

    const finalDataLength = finalData.length - 1
    return finalData.map((text, idx) => {
        return {
            title: finalDataLength === idx && idx > 0 ? "All" : truncate(text),
            value: text,
        }
    })
}

export function reformatTranslateResult(data: ITranslateResult): ITranslateReformatResult[] {
    const reformatData: ITranslateReformatResult[] = []

    reformatData.push({
        children: data.translation?.map((text, idx) => {
            return {
                title: text,
                key: text + idx,
                phonetic: data.basic?.phonetic,
            }
        }),
    })

    // Delete repeated text item
    // 在有道结果中 Translation 目前观测虽然是数组，但只会返回length为1的结果，而且重复只是和explains[0]。
    if (data.basic?.explains && data?.translation) {
        data.basic?.explains[0] === data?.translation[0] && data.basic.explains.shift()
    }

    reformatData.push({
        children: data.basic?.explains?.map((text, idx) => {
            return { title: text, key: text + idx }
        }),
    })

    reformatData.push({
        type: "Other Results",
        children: data.web?.map((webResultItem, idx) => {
            return {
                title: webResultItem.key,
                key: webResultItem.key + idx,
                subtitle: useSymbolSegmentationArrayText(webResultItem.value),
            }
        }),
    })

    return reformatData
}

// API Document https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
export function requestYoudaoAPI(queryText: string, targetLanguage: string): Promise<any> {
    function truncate(q: string): string {
        const len = q.length
        return len <= 20 ? q : q.substring(0, 10) + len + q.substring(len - 10, len)
    }

    const preferences: IPreferences = getPreferenceValues()
    const APP_ID = preferences.appId
    const APP_KEY = preferences.appKey

    const sha256 = crypto.createHash("sha256")
    const timestamp = Math.round(new Date().getTime() / 1000)
    const salt = timestamp
    const sha256Content = APP_ID + truncate(queryText) + salt + timestamp + APP_KEY
    const sign = sha256.update(sha256Content).digest("hex")

    return axios.post(
        "https://openapi.youdao.com/api",
        querystring.stringify({
            sign,
            salt,
            from: "auto",
            signType: "v3",
            q: queryText,
            appKey: APP_ID,
            curtime: timestamp,
            to: targetLanguage,
        })
    )
}

export function detectIsUppercaseCopyOrLowerCaseCopy(queryText = ""): COPY_TYPE {
    const isFirstRightArrow = queryText[0] === ">"
    const isSecondRightArrow = queryText[1] === ">"

    if (isFirstRightArrow && isSecondRightArrow) return COPY_TYPE.Uppercase

    if (isFirstRightArrow) return COPY_TYPE.LowercaseCamelCase

    return COPY_TYPE.Normal
}

export function removeDetectCopyModeSymbol(queryText: string, copyMode: COPY_TYPE): string {
    if (copyMode === COPY_TYPE.LowercaseCamelCase) {
        return queryText.substring(1, queryText.length).trim()
    }
    if (copyMode === COPY_TYPE.Uppercase) {
        return queryText.substring(2, queryText.length).trim()
    }

    return queryText
}

export function useSymbolSegmentationArrayText(textArray: string[]): string {
    return textArray.join("；")
}
