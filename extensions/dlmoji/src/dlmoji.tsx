import { preferences } from "./utils"
import { useEffect, useState } from "react"
import TranslateResult from "./TranslateResult"
import { Icon, List } from "@raycast/api"
import axios from "axios"
import { fetchBaiduTrans, fetchChineseEmojiTrans, fetchDeepl, fetchDeepmoji, fetchEmojiAll, fetchEmojiTrans, fetchEmojiTransHtml } from "./api"
import { formatBaiduTrans, formatChineseEmojiTrans, formatDeepmoji, formatEmojiAll, formatEmojiTrans } from "./formatter"
import { getEmojiTransKey } from "./storage";
import { SECTION_TYPE } from "./consts"


let delayFetchTranslateAPITimer: NodeJS.Timeout
let delayUpdateTargetLanguageTimer: NodeJS.Timeout
// let othersLoaded = false

export default function () {
    const [inputState, updateInputState] = useState<string>()
    const [isLoadingState, updateLoadingState] = useState<boolean>(false)
    const [translateResultState, updateTranslateResultState] = useState<ITranslateReformatResult[]>()

    function getEmojiData() {
        if (!inputState) return

        // String Filter
        const queryGlobal: string = inputState.replace(/邓港大/g, "猪")!
        const queryText: string = queryGlobal.replace(/伶仔|伶伶/g, "公主")
        const queryEmoji: string = queryGlobal.replace(/伶仔|伶伶/g, "👸")

        const hasChinese =  /[\u4E00-\u9FA5]+/g.test(queryText)
        const lang = hasChinese ? 'zh' : 'en'

        const dataList: ITranslateReformatResult[] = []

        // 接口速度较慢
        async function getDeepmoji(): Promise<any> {
            let enText: string = queryText
            if (hasChinese) {
                // const res = await fetchDeepl(queryText)
                // enText = res.data.data

                const res = await fetchBaiduTrans(queryText)
                enText = formatBaiduTrans(res.data)
                if (!enText) return ''
            }
            const res = await fetchDeepmoji(enText)
            if (!res?.data) return
            return formatDeepmoji(res.data.emoji[0])
        }
        async function getEmojiTrans(updateKey = false): Promise<any> {
            const key = await getEmojiTransKey(updateKey)
            const res = await fetchEmojiTrans(queryEmoji, lang, key)
            if (!res?.data) {
                return getEmojiTrans(true)
            }
            return formatEmojiTrans(res.data)
        }
        async function getChineseEmojiTrans(): Promise<any> {
            if (!preferences.useVerbatimTranslate || !hasChinese) return
            const res = await fetchChineseEmojiTrans(queryEmoji)
            if (!res?.data) return
            return formatChineseEmojiTrans(res.data)
        }
        async function getEmojiAll(): Promise<any> {
            if (!preferences.useEmojiAll) return
            const res = await fetchEmojiAll(queryText, lang)
            if (!res?.data) return
            return formatEmojiAll(res.data)
        }

        axios.all([getDeepmoji(), getEmojiTrans(), getChineseEmojiTrans(), getEmojiAll()]).then(
            axios.spread((deepmoji, emojiTrans, verbatimTrans, emojiAll) => {
                const result: ITranslateReformatResult = {
                    type: SECTION_TYPE.Translate,
                    title: SECTION_TYPE.Translate,
                    children: []
                }
                if (emojiTrans) {
                    result.children.push(emojiTrans)
                }
                if (deepmoji) {
                    result.children.push(deepmoji)
                }
                if (verbatimTrans) {
                    result.children.push(verbatimTrans)
                }
                dataList.unshift(result)

                if (emojiAll?.length > 0) {
                    dataList.push(...emojiAll)
                }
                
                updateLoadingState(false)
                updateTranslateResultState(dataList)
            })
        )

        // fetchEmojiAll(queryText, lang).then(res => {
        //     const results: ITranslateReformatResult[] = formatEmojiAll(res.data)
        //     if (results.length == 0) return

        //     dataList.push(...results)

        //     cancelLoadingState()
        //     updateTranslateResultState(dataList)
        // })
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
            <TranslateResult
                inputState={inputState}
                translateResultState={translateResultState}
            />
        </List>
    )
}
