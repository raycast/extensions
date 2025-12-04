import { COPY_TYPE } from "./consts"
import { useEffect, useState } from "react"
import ActionFeedback from "./ActionFeedBack"
import { TranslateError, LanguageConflict } from "./TranslateError"
import TranslateResult from "./TranslateResult"
import { ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api"
import { fetchAPI, getLanguageListItem, removeCopyFlag, detectCopyMode, formatTranslateResult } from "./parrot.shared"

let fetchResultStateCode = "-1"
let delayFetchTranslateAPITimer: NodeJS.Timeout
let delayUpdateTargetLanguageTimer: NodeJS.Timeout

export default function () {
    const [inputState, updateInputState] = useState<string>()
    const [isLoadingState, updateLoadingState] = useState<boolean>(false)
    const [isShowListDetail, setShowListDetail] = useState<boolean>(false)

    const preferences: IPreferences = getPreferenceValues()
    const defaultLanguage1 = getLanguageListItem(preferences.lang1)
    const defaultLanguage2 = getLanguageListItem(preferences.lang2)

    let delayRequestTime = parseInt(preferences.delayFetchTranslateAPITime) || 400

    if (delayRequestTime < 50) {
        delayRequestTime = 50
    } else if (delayRequestTime > 600) {
        delayRequestTime = 600
    }

    if (defaultLanguage1.languageId === defaultLanguage2.languageId) {
        return <LanguageConflict />
    }

    const [translateResultState, updateTranslateResultState] = useState<ITranslateReformatResult[]>()

    const [currentFromLanguageState, updateCurrentFromLanguageState] = useState<ILanguageListItem>()
    const [translateTargetLanguage, updateTranslateTargetLanguage] = useState<ILanguageListItem>(defaultLanguage1)
    const [currentTargetLanguage, setCurrentTargetLanguage] = useState<ILanguageListItem>(defaultLanguage1)

    const [copyModeState, updateCopyModeState] = useState<COPY_TYPE>(COPY_TYPE.Normal)

    function translate(fromLanguage: string, targetLanguage: string) {
        fetchAPI(inputState!, fromLanguage, targetLanguage).then((res) => {
            const resData: ITranslateResult = res.data

            const [from, to] = resData.l.split("2") // from2to

            if (from === to) {
                let target: string
                if (from === preferences.lang1) {
                    target = defaultLanguage2.languageId
                    setCurrentTargetLanguage(defaultLanguage2)
                } else {
                    target = defaultLanguage1.languageId
                    setCurrentTargetLanguage(defaultLanguage1)
                }

                translate(from, target)
                return
            }

            if (res.data.errorCode === "207") {
                delayUpdateTargetLanguageTimer = setTimeout(() => {
                    translate(from, to)
                }, delayRequestTime)
                return
            }

            updateLoadingState(false)
            fetchResultStateCode = res.data.errorCode

            const formattedData = formatTranslateResult(resData)
            const formattedDataItem: ITranslateReformatResult = formattedData[0]
            const formattedDataItemResultLength = formattedDataItem.children[0].title.length
            const resultLengthLimit = formattedDataItemResultLength > 50
            setShowListDetail(
                formattedData.length === 1 && formattedDataItem.children.length === 1 && resultLengthLimit,
            )

            updateTranslateResultState(formattedData)
            updateCurrentFromLanguageState(getLanguageListItem(from))
        })
    }

    useEffect(() => {
        if (!inputState) return // Prevent when first mounted run

        updateLoadingState(true)
        clearTimeout(delayUpdateTargetLanguageTimer)
        translate("auto", translateTargetLanguage.languageId)
    }, [inputState])

    function onInputChangeEvt(queryText: string) {
        updateLoadingState(false)
        clearTimeout(delayFetchTranslateAPITimer)

        const text = queryText.trim()
        if (text.length > 0) {
            delayFetchTranslateAPITimer = setTimeout(() => {
                updateCopyModeState(() => {
                    const freshCopyModeState = detectCopyMode(text)

                    const freshInputValue = removeCopyFlag(text, freshCopyModeState)
                    updateInputState(freshInputValue)

                    return freshCopyModeState
                })
            }, 800)
            return
        }

        updateTranslateResultState([])
    }

    function ListDetail() {
        if (fetchResultStateCode === "-1") return null

        if (fetchResultStateCode === "0") {
            return (
                <TranslateResult
                    doTranslate={translate}
                    inputState={inputState}
                    copyModeState={copyModeState}
                    translateResultState={translateResultState}
                    currentTargetLanguage={currentTargetLanguage}
                    currentFromLanguageState={currentFromLanguageState}
                    setCurrentTargetLanguage={setCurrentTargetLanguage}
                    updateTranslateTargetLanguage={updateTranslateTargetLanguage}
                />
            )
        }

        return <TranslateError errorCode={fetchResultStateCode} />
    }

    return (
        <List
            isLoading={isLoadingState}
            isShowingDetail={isShowListDetail}
            onSearchTextChange={onInputChangeEvt}
            searchBarPlaceholder={"Translate text"}
            actions={
                <ActionPanel>
                    <ActionFeedback />
                </ActionPanel>
            }
        >
            <List.EmptyView icon={Icon.TextDocument} title="Type something to translate." />
            <ListDetail />
        </List>
    )
}
