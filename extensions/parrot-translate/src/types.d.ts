type COPY_TYPE = "Normal" | "Uppercase" | "LowercaseCamelCase"
type RESULT_TYPE = "Standard" | "Detail" | "Derivatives"

interface ITranslateResult {
    l: string
    query: string
    returnPhrase: []
    errorCode: string
    translation: string[]
    web?: ITranslateResultWebItem[]
    basic?: ITranslateResultBasicItem
}

interface ITranslateReformatResult {
    type?: RESULT_TYPE
    title?: string
    children: ITranslateReformatResultItem[]
}

interface ITranslateReformatResultItem {
    key: string
    phonetic?: string
    title: string
    subtitle?: string
}

interface ITranslateResultWebItem {
    key: string
    value: string[]
}

interface ITranslateResultBasicItem {
    explains: string[]
    phonetic?: string
    "us-phonetic": string
    "uk-phonetic": string
}

interface IPreferences {
    lang1: string
    lang2: string
    appId: string
    appKey: string
    isPlayTTS: boolean
    isAutomaticPaste: boolean
    isQuickSwitchLanguage: boolean
    openThirdPartyDict: Application
    delayFetchTranslateAPITime: string
}

interface IListItemActionPanelItem {
    copyText?: string
    queryText?: string
    copyMode: COPY_TYPE
    currentFromLanguage?: ILanguageListItem
    currentTargetLanguage?: ILanguageListItem
    onLanguageUpdate: (language: ILanguageListItem) => void
}

interface IReformatTranslateResult {
    title: string
    value: string
}

interface IActionCopyListSection {
    copyText?: string
    copyMode: COPY_TYPE
    autoPasteText?: string
}

interface ILanguageListItem {
    languageId: string
    languageTitle: string
    languageVoice: string[]
    googleLanguageId?: string
}
