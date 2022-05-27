export const SYMBOL_NUM = 10;

export const numberPathList = (theme: string) => {
  return [
    { value: "0", path: `${theme}/0.png` },
    { value: "1", path: `${theme}/1.png` },
    { value: "2", path: `${theme}/2.png` },
    { value: "3", path: `${theme}/3.png` },
    { value: "4", path: `${theme}/4.png` },
    { value: "5", path: `${theme}/5.png` },
    { value: "6", path: `${theme}/6.png` },
    { value: "7", path: `${theme}/7.png` },
    { value: "8", path: `${theme}/8.png` },
    { value: "9", path: `${theme}/9.png` },
  ];
};
export const allTheme = ["bird", "pixel", "simple", "rainbow"];

export enum SectionTitle {
  ALL_LIFE_PROGRESS = "All life progress",
  YOU_HAVE = "You have",
  YOU_MAY_BE_ABLE_TO = "You may be able to",
  TIME_LEFT = "Time left",
}

export const timeLeftFirstList = [SectionTitle.TIME_LEFT, SectionTitle.YOU_HAVE, SectionTitle.YOU_MAY_BE_ABLE_TO];
export const timeLeftLastList = [SectionTitle.YOU_HAVE, SectionTitle.YOU_MAY_BE_ABLE_TO, SectionTitle.TIME_LEFT];

export const tagsTimeLeftFirst = [SectionTitle.ALL_LIFE_PROGRESS].concat(timeLeftFirstList);

export const tagsTimeLeftLast = [SectionTitle.ALL_LIFE_PROGRESS].concat(timeLeftLastList);
