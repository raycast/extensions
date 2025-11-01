import { Timezone } from "../types/types";
import { calculateDateTimeByOffset } from "../utils/common-utils";
import { useCachedPromise } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";
import { localStorageKey } from "../utils/costants";

const getStarredTimezones = async () => {
  const _localStorage = await LocalStorage.getItem<string>(localStorageKey.STAR_TIMEZONE);
  const _starTimezones = _localStorage ? (JSON.parse(_localStorage) as Timezone[]) : [];
  _starTimezones.forEach((value) => {
    const { date_time, unixtime } = calculateDateTimeByOffset(value.utc_offset);
    value.date_time = date_time;
    value.unixtime = unixtime;
  });
  return _starTimezones;
};

export function useStarTimezones() {
  return useCachedPromise(() => {
    return getStarredTimezones() as Promise<Timezone[]>;
  });
}
