import { LocalStorage } from "@raycast/api"
import { load } from "cheerio"
import { fetchEmojiTransHtml } from "./api"

const KEY_EMOJI_TRANS = "emoji-translate"

let emojiTransKey: string | undefined

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
