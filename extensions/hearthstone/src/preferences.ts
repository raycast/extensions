// src/preferences.ts
import { getPreferenceValues } from '@raycast/api'

export enum CardImageLanguage {
  ENGLISH = 'enUS',
  CHINESE = 'zhCN'
}

interface Preferences {
  defaultCardImageLanguage: string
}

export const getDefaultCardImageLanguage = (): CardImageLanguage => {
  const preferences = getPreferenceValues<Preferences>()
  
  if (preferences.defaultCardImageLanguage === 'zhCN') {
    return CardImageLanguage.CHINESE
  }
  
  return CardImageLanguage.ENGLISH
}
