type RESULT_TYPE = "Translate" | "Related Emojis" | "Phrases"

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
    title: string
    subtitle: string
    copyText: string
    fullTitle?: string
    description?: string
    url?: string
    codeUrl?: string
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
    useBidirectTranslate: boolean
    useEmojiTranslate: boolean
    useEmojiAll: boolean
    isAutomaticPaste: boolean
    deepmojiURL: string
    baiduAppId: string
    baiduAppSecret: string
}

interface IListItemActionPanelItem {
    copyText: string
    title: string
    url?: string
    codeUrl?: string
    details?: string
}

interface IReformatTranslateResult {
    title: string
    value: string
}

interface EmojiAllDetail {
    details?: string
    title: string
    url: string
    codeUrl: string
    copyText: string
}

interface IActionCopyListSection {
    copyText?: string
    autoPasteText?: string
}

interface ILanguageListItem {
    languageId: string
    languageTitle: string
    languageVoice: string[]
    googleLanguageId?: string
}

interface EmojiScore {
    emoji: string
    prob: number
}

interface EmojiDataItem {
    emoji_symbol: string
    type: string
    value: string
    title: string
    description: string
    emoji_symbol_urlencode: string
}

interface BaiduTranslateResult {
    from?: string
    to?: string
    trans_result?: BaiduTranslateItem[]
    error_code?: string
    error_msg?: string
}
interface BaiduTranslateItem {
    src: string
    dst: string
}
