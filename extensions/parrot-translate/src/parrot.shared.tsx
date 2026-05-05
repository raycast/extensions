import axios from "axios"
import crypto from "crypto"
import querystring from "node:querystring"
import { getPreferenceValues } from "@raycast/api"
import { COPY_TYPE, LANGUAGE_LIST, RESULT_TYPE } from "./consts"

export function formatTranslateResult(data: ITranslateResult): ITranslateReformatResult[] {
    const reformatData: ITranslateReformatResult[] = []
    let [from, to] = data.l.split("2")

    LANGUAGE_LIST.some((item) => item.languageId === from && (from = item.languageTitle))
    LANGUAGE_LIST.some((item) => item.languageId === to && (to = item.languageTitle))

    // Delete repeated text item
    // 在有道结果中 Translation 目前观测虽然是数组，但只会返回length为1的结果，而且重复只是和explains[0]。
    if (data.basic?.explains && data?.translation) {
        data.basic?.explains[0] === data?.translation[0] && data.basic.explains.shift()
    }

    reformatData.push({
        type: RESULT_TYPE.Standard,
        title: `${from} -> ${to}`,
        children: data.translation?.map((text, idx) => {
            return {
                title: text,
                key: text + idx,
                phonetic: data.basic?.phonetic,
            }
        }),
    })

    if (data.basic) {
        reformatData.push({
            type: RESULT_TYPE.Detail,
            children: data.basic.explains?.map((text, idx) => {
                return { title: text, key: text + idx }
            }),
        })
    }

    if (data.web) {
        reformatData.push({
            type: RESULT_TYPE.Derivatives,
            title: RESULT_TYPE.Derivatives,
            children: data.web.map((webResultItem, idx) => {
                return {
                    title: webResultItem.key,
                    key: webResultItem.key + idx,
                    subtitle: webResultItem.value.join("；"),
                }
            }),
        })
    }

    return reformatData
}

export function getLanguageListItem(value: string): ILanguageListItem {
    for (const langItem of LANGUAGE_LIST) {
        if (langItem.languageId === value) {
            return langItem
        }
    }

    return { languageId: "", languageTitle: "", languageVoice: [""] }
}

// API Document https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
export function fetchAPI(queryText: string, fromLanguage: string, targetLanguage: string): Promise<any> {
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
            strict: true,
            from: fromLanguage,
            signType: "v3",
            q: queryText,
            appKey: APP_ID,
            curtime: timestamp,
            to: targetLanguage,
        }),
    )
}

export function detectCopyMode(queryText = ""): COPY_TYPE {
    const isFirstRightArrow = queryText[0] === ">"
    const isSecondRightArrow = queryText[1] === ">"

    if (isFirstRightArrow && isSecondRightArrow) return COPY_TYPE.Uppercase

    if (isFirstRightArrow) return COPY_TYPE.LowercaseCamelCase

    return COPY_TYPE.Normal
}

export function removeCopyFlag(queryText: string, copyMode: COPY_TYPE): string {
    if (copyMode === COPY_TYPE.LowercaseCamelCase) {
        return queryText.substring(1, queryText.length).trim()
    }
    if (copyMode === COPY_TYPE.Uppercase) {
        return queryText.substring(2, queryText.length).trim()
    }

    return queryText
}
