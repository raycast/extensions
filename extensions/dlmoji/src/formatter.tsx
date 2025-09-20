import { COPY_SEPARATOR, SECTION_TYPE } from "./consts"
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

    function extract(item: EmojiDataItem, url: string, codeUrl: string): ITranslateReformatResultItem {
        const title = decode(item.value)
        const description = decode(item.description.replace(/<[^>]+>|\r|\n|\\s/gi, "")) // remove space, line break and html label
        const emoji = item.emoji_symbol
        return {
            key: emoji + Math.random(),
            title: truncate(title, 26),
            subtitle: emoji,
            copyText: emoji,
            fullTitle: title + "  " + emoji,
            description: description,
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

function constructResultItem(title: string, emojiText: string) {
    return {
        key: emojiText + Math.random(),
        title: title,
        subtitle: emojiText,
        copyText: emojiText,
    }
}
