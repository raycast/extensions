import { preferences } from "./utils"
import { useEffect, useState } from "react"
import TranslateResult from "./TranslateResult"
import { Icon, List } from "@raycast/api"
import axios from "axios"
import { cloneDeep } from "lodash"
import {
    fetchBaiduTrans,
    fetchChineseEmojiTrans,
    fetchDeepmoji,
    fetchEmojiAll,
    fetchEmojiTrans,
    preConnect,
    setAxiosTimeout,
} from "./api"
import {
    formatBaiduTrans,
    formatChineseEmojiTrans,
    formatDeepmoji,
    formatEmojiAll,
    formatEmojiTrans,
} from "./formatter"
import { getEmojiTransKey } from "./storage"
import { SECTION_TYPE } from "./consts"

// use preConnect to reduce API response time
preConnect()
setTimeout(() => {
    setAxiosTimeout(6)
}, 8000)

let delayFetchTranslateAPITimer: NodeJS.Timeout
let delayUpdateTargetLanguageTimer: NodeJS.Timeout

export default function () {
    const [inputState, updateInputState] = useState<string>()
    const [isLoadingState, updateLoadingState] = useState<boolean>(false)
    const [translateResultState, updateTranslateResultState] = useState<ITranslateReformatResult[]>()

    function getEmojiData() {
        if (!inputState) return

        // String Filter
        const queryGlobal: string = inputState
        const queryText: string = queryGlobal //.replace(/Jolin|Ling/g, "princess").replace(/Danny/g, "prince")
        const queryEmoji: string = queryGlobal //.replace(/Jolin|Ling/g, "🐰").replace(/Danny/g, "🦊")

        const hasChinese = /[\u4E00-\u9FA5]+/g.test(queryText)
        const lang = hasChinese ? "zh" : "en"
        const dataList: ITranslateReformatResult[] = []

        // 接口速度较慢
        async function getDeepmoji(): Promise<ITranslateReformatResultItem | undefined> {
            let enText: string = queryText
            if (hasChinese) {
                const res = await fetchBaiduTrans(queryText)
                enText = formatBaiduTrans(res.data)
                if (!enText) return
            }
            const res = await fetchDeepmoji(enText)
            if (!res?.data) return
            console.log("Deepmoji Data Received")
            return formatDeepmoji(res.data.emoji[0])
        }
        async function getEmojiTrans(updateKey = false): Promise<ITranslateReformatResultItem | undefined> {
            if (!preferences.useEmojiTranslate) return
            const key = await getEmojiTransKey(updateKey)
            const res = await fetchEmojiTrans(queryEmoji, lang, key)
            if (!res) return
            if (!res.data) {
                console.log("Emoji Translation Key Update")
                return getEmojiTrans(true)
            }
            console.log("EmojiTrans Data Received")
            return formatEmojiTrans(res.data)
        }
        async function getChineseEmojiTrans(): Promise<ITranslateReformatResultItem | undefined> {
            if (!preferences.useVerbatimTranslate || !hasChinese) return
            const res = await fetchChineseEmojiTrans(queryEmoji)
            if (!res?.data) return
            console.log("ChineseEmojiTrans Data Received")
            return formatChineseEmojiTrans(res.data)
        }
        async function getEmojiAll(): Promise<any> {
            if (!preferences.useEmojiAll) return
            const res = await fetchEmojiAll(queryText, lang)
            if (!res?.data) return
            console.log("EmojiAll Data Received")
            return formatEmojiAll(res.data, lang)
        }

        getEmojiTrans().then((emojiTrans) => {
            if (!emojiTrans) return
            if (dataList[0]?.type === SECTION_TYPE.Translate) {
                dataList[0].children.unshift(emojiTrans)
            } else {
                dataList.unshift({
                    type: SECTION_TYPE.Translate,
                    title: SECTION_TYPE.Translate,
                    children: [emojiTrans],
                })
            }
            updateTranslateResultState(cloneDeep(dataList))
        })

        axios.all([getDeepmoji(), getChineseEmojiTrans(), getEmojiAll()]).then(
            axios.spread((deepmoji, verbatimTrans, emojiAll) => {
                const transArray: ITranslateReformatResultItem[] = []
                if (deepmoji) {
                    transArray.push(deepmoji)
                }
                if (verbatimTrans) {
                    transArray.push(verbatimTrans)
                }

                if (dataList[0]?.type === SECTION_TYPE.Translate) {
                    dataList[0].children.push(...transArray)
                } else {
                    dataList.unshift({
                        type: SECTION_TYPE.Translate,
                        title: SECTION_TYPE.Translate,
                        children: transArray,
                    })
                }

                if (emojiAll?.length > 0) {
                    dataList.push(...emojiAll)
                }

                updateLoadingState(false)
                updateTranslateResultState(dataList)
            })
        )
    }

    useEffect(() => {
        if (!inputState) return // Prevent when first mounted run

        // othersLoaded = false
        updateLoadingState(true)
        clearTimeout(delayUpdateTargetLanguageTimer)
        getEmojiData()
        // translate("auto", translateTargetLanguage.languageId)
    }, [inputState])

    function onInputChangeEvt(queryText: string) {
        updateLoadingState(false)
        clearTimeout(delayFetchTranslateAPITimer)

        const text = queryText.trim()
        if (text.length > 0) {
            delayFetchTranslateAPITimer = setTimeout(() => {
                updateInputState(text)
            }, 800)
            return
        }

        updateTranslateResultState([])
    }

    return (
        <List
            isLoading={isLoadingState}
            isShowingDetail={false}
            onSearchTextChange={onInputChangeEvt}
            searchBarPlaceholder={"Translate text"}
        >
            <List.EmptyView icon={Icon.TextDocument} title="Type something to translate." />
            <TranslateResult inputState={inputState} translateResultState={translateResultState} />
        </List>
    )
}
