import { COPY_TYPE } from "./consts"
import { ListActionPanel } from "./components"
import { Fragment, useEffect, useState } from "react"
import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api"
import { ILanguageListItem, IPreferences, ITranslateReformatResult, ITranslateResult } from "./types"
import {
    requestYoudaoAPI,
    getItemFromLanguageList,
    reformatTranslateResult,
    detectIsUppercaseCopyOrLowerCaseCopy,
    removeDetectCopyModeSymbol,
} from "./shared.func"

let fetchResultStateCode = "-1"
let delayFetchTranslateAPITimer: NodeJS.Timeout

export default function () {
    const [inputState, updateInputState] = useState<string>()
    const [isLoadingState, updateLoadingState] = useState<boolean>(false)

    const preferences: IPreferences = getPreferenceValues()
    const defaultLanguage1 = getItemFromLanguageList(preferences.lang1)
    const defaultLanguage2 = getItemFromLanguageList(preferences.lang2)

    const [translateTargetLanguage, updateTranslateTargetLanguage] = useState<ILanguageListItem>(defaultLanguage1)
    const [translateResultState, updateTranslateResultState] = useState<ITranslateReformatResult[]>()

    const [translateFromLanguageState, updateTranslateFromLanguageState] = useState<ILanguageListItem>()
    const [currentTargetLanguageState, updateCurrentTargetLanguageState] = useState<ILanguageListItem>()

    const [copyModeState, updateCopyModeState] = useState<COPY_TYPE>(COPY_TYPE.Normal)

    useEffect(() => {
        if (!inputState) return // Prevent when mounted run

        clearTimeout(delayFetchTranslateAPITimer)
        delayFetchTranslateAPITimer = setTimeout(() => {
            requestYoudaoAPI(inputState, translateTargetLanguage.languageId).then((res) => {
                const resData: ITranslateResult = res.data

                const [a, b] = resData.l.split("2") // en2zh

                if (a === b) {
                    updateTranslateTargetLanguage(a === preferences.lang1 ? defaultLanguage2 : defaultLanguage1)
                    return
                }

                updateLoadingState(false)
                fetchResultStateCode = res.data.errorCode
                updateTranslateResultState(reformatTranslateResult(resData))

                updateTranslateFromLanguageState(getItemFromLanguageList(a))
                updateCurrentTargetLanguageState(getItemFromLanguageList(b))
            })
        }, 900)
    }, [inputState, translateTargetLanguage])

    function ListDetail() {
        if (fetchResultStateCode === "-1") return null

        if (fetchResultStateCode === "0") {
            return (
                <Fragment>
                    {translateResultState?.map((result, idx) => {
                        return (
                            <List.Section key={idx} title={result.type}>
                                {result.children?.map((item) => {
                                    return (
                                        <List.Item
                                            key={item.key}
                                            icon={Icon.Text}
                                            title={item.title}
                                            subtitle={item?.subtitle}
                                            accessoryTitle={item.phonetic}
                                            actions={
                                                <ListActionPanel
                                                    queryText={inputState}
                                                    copyMode={copyModeState}
                                                    copyText={item?.subtitle || item.title}
                                                    currentFromLanguage={translateFromLanguageState}
                                                    onLanguageUpdate={updateTranslateTargetLanguage}
                                                    currentTargetLanguage={currentTargetLanguageState}
                                                />
                                            }
                                        />
                                    )
                                })}
                            </List.Section>
                        )
                    })}
                </Fragment>
            )
        }

        // TODO: Try use Detail
        return (
            <List.Item
                icon={Icon.XmarkCircle}
                title={`Sorry! We have some problems..`}
                subtitle={`code: ${fetchResultStateCode}`}
                actions={
                    <ActionPanel>
                        <Action.OpenInBrowser
                            title="Help"
                            icon={Icon.QuestionMark}
                            url="https://github.com/Haojen/raycast-Parrot#error-code-information"
                        />
                    </ActionPanel>
                }
            />
        )
    }
    function onInputChangeEvt(queryText: string) {
        clearTimeout(delayFetchTranslateAPITimer)

        const text = queryText.trim()
        if (text.length > 0) {
            updateCopyModeState(() => {
                const freshCopyModeState = detectIsUppercaseCopyOrLowerCaseCopy(text)

                const freshInputValue = removeDetectCopyModeSymbol(text, freshCopyModeState)
                updateLoadingState(freshInputValue !== inputState)
                updateInputState(freshInputValue)

                return freshCopyModeState
            })

            return
        }

        updateLoadingState(false)
        updateTranslateResultState([])
    }

    return (
        <List
            isLoading={isLoadingState}
            searchBarPlaceholder={"Translate to.."}
            onSearchTextChange={(inputText) => onInputChangeEvt(inputText)}
            navigationTitle={
                translateFromLanguageState?.languageTitle && currentTargetLanguageState?.languageTitle
                    ? `Parrot: ${translateFromLanguageState.languageTitle} → ${currentTargetLanguageState.languageTitle}`
                    : "Parrot"
            }
            actions={
                <ListActionPanel
                    queryText={inputState}
                    copyMode={copyModeState}
                    currentFromLanguage={translateFromLanguageState}
                    currentTargetLanguage={currentTargetLanguageState}
                    onLanguageUpdate={updateTranslateTargetLanguage}
                />
            }
        >
            <ListDetail />
        </List>
    )
}
