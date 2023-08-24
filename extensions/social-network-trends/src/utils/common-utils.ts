import { Cache, Icon } from "@raycast/api";
import { CacheKey } from "./constants";

export const numberIcons = [
  Icon.Number01,
  Icon.Number02,
  Icon.Number03,
  Icon.Number04,
  Icon.Number05,
  Icon.Number06,
  Icon.Number07,
  Icon.Number08,
  Icon.Number09,
  Icon.Number10,
  Icon.Number11,
  Icon.Number12,
  Icon.Number13,
  Icon.Number14,
  Icon.Number15,
  Icon.Number16,
  Icon.Number17,
  Icon.Number18,
  Icon.Number19,
  Icon.Number20,
  Icon.Number21,
  Icon.Number22,
  Icon.Number23,
  Icon.Number24,
  Icon.Number25,
  Icon.Number26,
  Icon.Number27,
  Icon.Number28,
  Icon.Number29,
  Icon.Number30,
  Icon.Number31,
  Icon.Number32,
  Icon.Number33,
  Icon.Number34,
  Icon.Number35,
  Icon.Number36,
  Icon.Number37,
  Icon.Number38,
  Icon.Number39,
  Icon.Number40,
  Icon.Number41,
  Icon.Number42,
  Icon.Number43,
  Icon.Number44,
  Icon.Number45,
  Icon.Number46,
  Icon.Number47,
  Icon.Number48,
  Icon.Number49,
  Icon.Number50,
];

export const isEmpty = (str: string | undefined): boolean => {
  return typeof str === "undefined" || str === "";
};

export const timeStampToDate = (timeStamp: number) => {
  const date = new Date(timeStamp);
  return date.toLocaleTimeString() + " " + date.toLocaleDateString();
};

export const getLastRefreshTime = () => {
  const cache = new Cache();
  const cacheRefreshTime = cache.get(CacheKey.REFRESH_TIME);
  if (typeof cacheRefreshTime === "string") {
    return parseInt(cacheRefreshTime);
  }
  return Date.now();
};
