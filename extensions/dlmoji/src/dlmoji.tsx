import { checkEmojiOnly, preferences } from "./utils"
import { useEffect, useState } from "react"
import TranslateResult from "./TranslateResult"
import { Icon, List } from "@raycast/api"
import axios from "axios"
import { cloneDeep } from "lodash"
import {
    fetchBaiduTrans,
    fetchBidirectTrans,
    fetchDeepmoji,
    fetchEmojiAll,
    fetchEmojiTrans,
    preConnect,
    setAxiosTimeout,
} from "./api"
import { formatBaiduTrans, formatDeepmoji, formatEmojiAll, formatEmojiTrans } from "./formatter"
import { getRecentLanguage } from "./storage"
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

    async function getEmojiData() {
        if (!inputState) return

        const queryText: string = inputState
        const hasChinese = /[\u4E00-\u9FA5]+/g.test(queryText)
        const lang = await getRecentLanguage(queryText)
        const dataList: ITranslateReformatResult[] = []

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
        async function doEmojiTrans(): Promise<ITranslateReformatResultItem | undefined> {
            let res
            // fetch EmojiALL-Translator API
            const isEmojiText = checkEmojiOnly(queryText)
            if (preferences.useBidirectTranslate && (isEmojiText || hasChinese)) {
                res = await fetchBidirectTrans(queryText, lang, isEmojiText)
                if (!res?.data?.data) return
                console.log("BiTrans Data Received")
                return formatEmojiTrans(res.data.data)
            }
            // fetch EmojiTranslate API
            if (!preferences.useEmojiTranslate) return
            let forceUpdateKey = false
            res = await fetchEmojiTrans(queryText, lang, forceUpdateKey)
            if (!res) return
            if (!res.data) {
                forceUpdateKey = true
                console.log("Emoji Translation Key Update")
                res = await fetchEmojiTrans(queryText, lang, forceUpdateKey)
            }
            console.log("EmojiTrans Data Received")
            return formatEmojiTrans(res.data)
        }
        async function getEmojiAll(): Promise<any> {
            if (!preferences.useEmojiAll) return
            const res = await fetchEmojiAll(queryText, lang)
            if (!res?.data) return
            console.log("EmojiAll Data Received")
            return formatEmojiAll(res.data, lang)
        }

        doEmojiTrans().then((emojiTrans) => {
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

        axios.all([getDeepmoji(), getEmojiAll()]).then(
            axios.spread((deepmoji, emojiAll) => {
                const transArray: ITranslateReformatResultItem[] = []
                if (deepmoji) {
                    transArray.push(deepmoji)
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

        updateLoadingState(true)
        clearTimeout(delayUpdateTargetLanguageTimer)
        getEmojiData()
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
