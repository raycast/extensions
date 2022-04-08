import { COPY_TYPE } from "./consts"
import { Fragment, useEffect, useState } from "react"
import { ActionFeedback, ListActionPanel } from "./components"
import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api"
import { ILanguageListItem, IPreferences, ITranslateReformatResult, ITranslateResult } from "./types"
import {
    requestYoudaoAPI,
    getItemFromLanguageList,
    reformatTranslateResult,
    removeDetectCopyModeSymbol,
    detectIsUppercaseCopyOrLowerCaseCopy,
} from "./shared.func"

let fetchResultStateCode = "-1"
let isUserChosenTargetLanguage = false
let delayFetchTranslateAPITimer: NodeJS.Timeout
let delayUpdateTargetLanguageTimer: NodeJS.Timeout

export default function () {
    const [inputState, updateInputState] = useState<string>()
    const [isLoadingState, updateLoadingState] = useState<boolean>(false)

    const preferences: IPreferences = getPreferenceValues()
    const defaultLanguage1 = getItemFromLanguageList(preferences.lang1)
    const defaultLanguage2 = getItemFromLanguageList(preferences.lang2)

    if (defaultLanguage1.languageId === defaultLanguage2.languageId) {
        return (
            <List>
                <List.Item
                    title={"Language Conflict"}
                    icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
                    subtitle={"Your first Language with second Language must be different."}
                />
            </List>
        )
    }

    const [translateResultState, updateTranslateResultState] = useState<ITranslateReformatResult[]>()

    const [currentFromLanguageState, updateCurrentFromLanguageState] = useState<ILanguageListItem>()
    const [translateTargetLanguage, updateTranslateTargetLanguage] = useState<ILanguageListItem>(defaultLanguage1)

    const [copyModeState, updateCopyModeState] = useState<COPY_TYPE>(COPY_TYPE.Normal)

    useEffect(() => {
        if (!inputState) return // Prevent when first mounted run

        updateLoadingState(true)
        clearTimeout(delayUpdateTargetLanguageTimer)

        // default is X -> A
        requestYoudaoAPI(inputState, translateTargetLanguage.languageId).then((res) => {
            const resData: ITranslateResult = res.data

            const [from, to] = resData.l.split("2") // en2zh

            if (!isUserChosenTargetLanguage) {
                // A -> B with B <- A
                if (from === to) {
                    delayUpdateTargetLanguageTimer = setTimeout(() => {
                        updateTranslateTargetLanguage(from === preferences.lang2 ? defaultLanguage1 : defaultLanguage2)
                    }, 900)
                    return
                }
                // X -> A
                else if (
                    from !== preferences.lang1 &&
                    translateTargetLanguage.languageId !== defaultLanguage1.languageId
                ) {
                    delayUpdateTargetLanguageTimer = setTimeout(() => {
                        updateTranslateTargetLanguage(defaultLanguage1)
                    }, 900)
                    return
                }
            }

            updateLoadingState(false)
            fetchResultStateCode = res.data.errorCode
            updateTranslateResultState(reformatTranslateResult(resData))
            updateCurrentFromLanguageState(getItemFromLanguageList(from))
        })
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
                                                    currentFromLanguage={currentFromLanguageState}
                                                    onLanguageUpdate={(value) => {
                                                        isUserChosenTargetLanguage = true
                                                        updateTranslateTargetLanguage(value)
                                                    }}
                                                    currentTargetLanguage={translateTargetLanguage}
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

        return (
            <List.Item
                title={`Sorry! We have some problems..`}
                subtitle={`code: ${fetchResultStateCode}`}
                icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
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
        updateLoadingState(false)
        clearTimeout(delayFetchTranslateAPITimer)

        const text = queryText.trim()
        if (text.length > 0) {
            delayFetchTranslateAPITimer = setTimeout(() => {
                updateCopyModeState(() => {
                    const freshCopyModeState = detectIsUppercaseCopyOrLowerCaseCopy(text)

                    const freshInputValue = removeDetectCopyModeSymbol(text, freshCopyModeState)
                    updateInputState(freshInputValue)

                    return freshCopyModeState
                })
            }, 800)
            return
        }

        updateTranslateResultState([])
    }

    return (
        <List
            isLoading={isLoadingState}
            searchBarPlaceholder={"Translate text"}
            onSearchTextChange={onInputChangeEvt}
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
