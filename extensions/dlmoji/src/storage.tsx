import { LocalStorage } from "@raycast/api"
import { load } from "cheerio"
import { fetchEmojiTransHtml } from "./api"
import { checkEmojiOnly } from "./utils"

const KEY_EMOJI_TRANS = "emoji-translate"
const KEY_RECENT_LANG = "recent-lang"

let emojiTransKey: string | undefined
let recentLang: string | undefined

export async function getEmojiTransKey(forceUpdate = false): Promise<string> {
    if (emojiTransKey && !forceUpdate) {
        return emojiTransKey
    }

    emojiTransKey = await LocalStorage.getItem<string>(KEY_EMOJI_TRANS)
    if (!emojiTransKey || forceUpdate) {
        const res = await fetchEmojiTransHtml()
        const $ = load(res.data)
        emojiTransKey = $("div #emojitranslate_key").text()
        LocalStorage.setItem(KEY_EMOJI_TRANS, emojiTransKey)
    }

    return emojiTransKey
}

export async function getRecentLanguage(queryText: string) {
    if (checkEmojiOnly(queryText)) {
        if (!recentLang) {
            recentLang = await LocalStorage.getItem<string>(KEY_RECENT_LANG)
            recentLang = recentLang ? recentLang : "en"
        }
        return recentLang
    }

    const hasChinese = /[\u4E00-\u9FA5]+/g.test(queryText)
    recentLang = hasChinese ? "zh" : "en"
    LocalStorage.setItem(KEY_RECENT_LANG, recentLang)

    return recentLang
}
