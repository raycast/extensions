import { COPY_SEPARATOR, SECTION_TYPE } from "./consts"
import { load } from "cheerio"
import { truncate } from "./utils"
import { decode } from "html-entities"

const MAX_LENGTH = 5

export function formatEmojiTrans(emojis: string): ITranslateReformatResultItem {
    return constructResultItem("Emoji Translate", emojis)
}

export function formatBaiduTrans(data: BaiduTranslateResult) {
    if (data?.trans_result) {
        return data.trans_result[0].dst
    }
    return ""
}

export function formatDeepmoji(preds: EmojiScore[]): ITranslateReformatResultItem {
    preds
        .sort(function (a, b) {
            return a.prob - b.prob
        })
        .reverse()
    const emojiArray = preds.slice(0, 5).map((value) => {
        return value.emoji
    })
    const emojiText = emojiArray.join(" ")
    const copyText = emojiArray.join(COPY_SEPARATOR)

    return {
        title: "Emotion Analysis",
        subtitle: emojiText,
        key: emojiText,
        copyText: copyText,
    }
}

export function formatEmojiAll(data: EmojiDataItem[], lang = "en"): ITranslateReformatResult[] | undefined {
    if (!data) return

    function extract(item: EmojiDataItem, url: string, codeUrl: string) {
        const title = decode(item.value)
        const description = decode(item.description.replace(/<[^>]+>|\r|\n|\\s/gi, "")) // 去掉换行,空格,html标签
        const emoji = item.emoji_symbol
        // const copyText = description ? emoji + COPY_SEPARATOR + description : emoji
        return {
            title: truncate(title, 26) + "  " + emoji,
            fullTitle: title + "  " + emoji,
            subtitle: description,
            key: emoji,
            copyText: emoji,
            url: url,
            codeUrl: codeUrl,
        }
    }

    const emojiList: ITranslateReformatResultItem[] = []
    const combineList: ITranslateReformatResultItem[] = []
    data.forEach((item) => {
        if (item.type === "emoji") {
            lang = lang === "zh" ? "zh-hans" : lang
            const codeUrl =
                "https://www.emojiall.com/" + lang + "/code/" + item.emoji_symbol.codePointAt(0)?.toString(16)
            const url = "https://www.emojiall.com/" + lang + "/emoji/" + item.emoji_symbol_urlencode
            emojiList.push(extract(item, url, codeUrl))
        } else if (item.type === "combine") {
            combineList.push(extract(item, "", ""))
        }
    })
    emojiList.splice(MAX_LENGTH)
    combineList.splice(MAX_LENGTH)

    const reformatData: ITranslateReformatResult[] = []
    if (emojiList.length > 0) {
        reformatData.push({
            type: SECTION_TYPE.Emoji,
            title: SECTION_TYPE.Emoji,
            children: emojiList,
        })
    }
    if (combineList.length > 0) {
        reformatData.push({
            type: SECTION_TYPE.Phrase,
            title: SECTION_TYPE.Phrase,
            children: combineList,
        })
    }

    return reformatData
}

export function formatChineseEmojiTrans(doc: string): ITranslateReformatResultItem {
    const $ = load(doc)
    const text: string = $("meta[name=keywords]").attr("content")!
    const emojis: string = text.split(", ").slice(1).join(" ")
    return constructResultItem("Verbatim Translate", emojis)
}

function constructResultItem(title: string, emojiText: string) {
    return {
        title: title,
        subtitle: emojiText,
        key: emojiText,
        copyText: emojiText,
    }
}
