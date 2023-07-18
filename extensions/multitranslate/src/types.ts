import type { LanguageCode } from './data/languages'

export { LanguageCode }

export interface TranslateResult {
  original: string
  translated: string
  from: LanguageCode
  to: LanguageCode
}

export interface WebDictionary {
  name: string
  lang: LanguageCode
  /**
   * Enable this dictionary when user have one of the target languages
   */
  enables?: LanguageCode[]
  /**
   * Supports sentence or not
   * @default false
   */
  sentence?: boolean
  url: (text: string, result: TranslateResult) => string | void
}
