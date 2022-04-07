import { COPY_TYPE } from "./consts"

export interface ITranslateResult {
    l: string
    query: string
    returnPhrase: []
    errorCode: string
    translation: string[]
    web?: ITranslateResultWebItem[]
    basic?: ITranslateResultBasicItem
}

export interface ITranslateReformatResult {
    type?: string
    children?: ITranslateReformatResultItem[]
}

export interface ITranslateReformatResultItem {
    key: string
    phonetic?: string
    title: string
    subtitle?: string
}

export interface ITranslateResultWebItem {
    key: string
    value: string[]
}

export interface ITranslateResultBasicItem {
    explains: string[]
    phonetic?: string
    "us-phonetic": string
    "uk-phonetic": string
}

export interface IPreferences {
    lang1: string
    lang2: string
    appId: string
    appKey: string
    isAutomaticPaste: boolean
}

export interface IListItemActionPanelItem {
    copyText?: string
    queryText?: string
    copyMode: COPY_TYPE
    currentFromLanguage?: ILanguageListItem
    currentTargetLanguage?: ILanguageListItem
    onLanguageUpdate: (language: ILanguageListItem) => void
}

export interface IReformatTranslateResult {
    title: string
    value: string
}

export interface IActionCopyListSection {
    copyText?: string
    copyMode: COPY_TYPE
    autoPasteText?: string
}

export interface ILanguageListItem {
    languageId: string
    languageTitle: string
    languageVoice: string[]
    googleLanguageId?: string
}
