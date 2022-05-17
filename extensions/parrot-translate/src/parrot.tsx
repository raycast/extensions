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
let delayFetchTranslateAPITimer: NodeJS.Timeout
let delayUpdateTargetLanguageTimer: NodeJS.Timeout

export default function () {
    const [inputState, updateInputState] = useState<string>()
    const [isLoadingState, updateLoadingState] = useState<boolean>(false)

    const preferences: IPreferences = getPreferenceValues()
    const defaultLanguage1 = getItemFromLanguageList(preferences.lang1)
    const defaultLanguage2 = getItemFromLanguageList(preferences.lang2)

    let delayRequestTime = parseInt(preferences.delayFetchTranslateAPITime) || 400

    if (delayRequestTime < 50) {
        delayRequestTime = 50
    } else if (delayRequestTime > 600) {
        delayRequestTime = 600
    }

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
    const [currentTargetLanguage, setCurrentTargetLanguage] = useState<ILanguageListItem>(defaultLanguage1)

    const [copyModeState, updateCopyModeState] = useState<COPY_TYPE>(COPY_TYPE.Normal)

    function translate(fromLanguage: string, targetLanguage: string) {
        requestYoudaoAPI(inputState!, fromLanguage, targetLanguage).then((res) => {
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
            updateTranslateResultState(reformatTranslateResult(resData))
            updateCurrentFromLanguageState(getItemFromLanguageList(from))
        })
    }

    useEffect(() => {
        if (!inputState) return // Prevent when first mounted run

        updateLoadingState(true)
        clearTimeout(delayUpdateTargetLanguageTimer)
        translate("auto", translateTargetLanguage.languageId)
    }, [inputState])

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
                                                    currentTargetLanguage={currentTargetLanguage}
                                                    onLanguageUpdate={(value) => {
                                                        setCurrentTargetLanguage(value)
                                                        updateTranslateTargetLanguage(value)
                                                        translate("auto", value.languageId)
                                                    }}
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
