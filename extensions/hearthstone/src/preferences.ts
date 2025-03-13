// src/preferences.ts
import { getPreferenceValues } from '@raycast/api';
import { Preferences } from './types/types';

export enum CardImageLanguage {
  ENGLISH = 'enUS',
  CHINESE = 'zhCN',
}

export const getDefaultCardImageLanguage = (): CardImageLanguage => {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.defaultCardImageLanguage === 'zhCN') {
    return CardImageLanguage.CHINESE;
  }

  return CardImageLanguage.ENGLISH;
};
