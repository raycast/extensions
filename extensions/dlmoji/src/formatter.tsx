import { SECTION_TYPE } from "./consts"
import { load } from 'cheerio'
import { truncate } from "./utils"

const MAX_LENGTH = 5

export function formatBaiduTrans(data: BaiduTranslateResult) {
    if (data.trans_result){
        return data.trans_result[0].dst
    }
    return ''
}

export function formatDeepmoji(preds: EmojiScore[]): ITranslateReformatResultItem {
    preds.sort(function(a, b) {
        return a.prob - b.prob
    }).reverse()
    const emojis = preds.slice(0, 5).map((value,idx) => {
        return value.emoji
    }).join('; ')

    return {
        title: 'Emotion Analysis',
        subtitle: emojis,
        key: emojis
    }
}

export function formatEmojiTrans(emojis: string): ITranslateReformatResultItem {
    return {
        title: 'Emoji Translate',
        subtitle: emojis,
        key: emojis
    }
}

export function formatEmojiAll(data: EmojiDataItem[]): ITranslateReformatResult[] | undefined {
    if (!data) return

    function extract(item: EmojiDataItem) {
        return {
            title: truncate(item.value, 32) + '  ' + item.emoji_symbol,
            subtitle: item.description.replace(/<[^>]+>|\r|\n|\\s/ig, ''),  // 去掉换行,空格,html标签
            key: item.emoji_symbol
        }
    }

    const emojiList: ITranslateReformatResultItem[] = []
    const combineList: ITranslateReformatResultItem[] = []
    data.forEach((item, idx) => {
        if (item.type === 'emoji') {
            emojiList.push(extract(item))
        }
        else if (item.type === 'combine') {
            combineList.push(extract(item))
        }
    })
    emojiList.splice(MAX_LENGTH)
    combineList.splice(MAX_LENGTH)

    const reformatData: ITranslateReformatResult[] = []
    if (emojiList.length > 0) {
        reformatData.push({
            type: SECTION_TYPE.Emoji,
            title:  SECTION_TYPE.Emoji,
            children: emojiList
        })
    }
    if (combineList.length > 0) {
        reformatData.push({
            type: SECTION_TYPE.Phrase,
            title:  SECTION_TYPE.Phrase,
            children: combineList
        })
    }
    
    return reformatData
}

export function formatChineseEmojiTrans(doc: string): ITranslateReformatResultItem {
    const $ = load(doc);
    const text: string = $('meta[name=keywords]').attr("content")!
    const emojis: string = text.split(', ').slice(1).join(' ')

    return {
        title: 'Verbatim Translate',
        subtitle: emojis,
        key: emojis
    }
}