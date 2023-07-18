import _languages from './languages.json'

export type LanguageCode = keyof typeof _languages

export interface LanguagesItem {
  code: LanguageCode
  name: string
  flag?: string
}

export const languagesByCode = _languages as Record<LanguageCode, LanguagesItem>
export const languages: LanguagesItem[] = Object.values(languagesByCode)

export function getLanguageName(code: LanguageCode) {
  return languagesByCode[code]?.name || code
}
