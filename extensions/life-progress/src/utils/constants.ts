export const SYMBOL_NUM = 10;

export enum LocalStorageKey {
  COUNTDOWN_DATE_KEY = "Countdown date",
}

export enum SectionTitle {
  ALL_LIFE_PROGRESS = "All",
  YOU_HAVE = "You have",
  YOU_MAY_BE_ABLE_TO = "You may be able to",
  COUNTDOWN_DATE = "Countdown Date",
}

export const timeLeftFirstList = [SectionTitle.COUNTDOWN_DATE, SectionTitle.YOU_HAVE, SectionTitle.YOU_MAY_BE_ABLE_TO];
export const timeLeftLastList = [SectionTitle.YOU_HAVE, SectionTitle.YOU_MAY_BE_ABLE_TO, SectionTitle.COUNTDOWN_DATE];

export const tagsTimeLeftFirst = [SectionTitle.ALL_LIFE_PROGRESS].concat(timeLeftFirstList);

export const tagsTimeLeftLast = [SectionTitle.ALL_LIFE_PROGRESS].concat(timeLeftLastList);
