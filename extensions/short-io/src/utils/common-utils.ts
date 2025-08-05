import { LocalStorage } from "@raycast/api";
import { Domain } from "../types/types";
import { CacheKey } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(typeof string !== "undefined" && string != null && String(string).length > 0);
};

export function formatISODate(isoDate: string): string {
  try {
    if (!isoDate) {
      return "";
    }
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份从0开始，需要加1
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return isoDate;
  }
}

export async function saveDefaultDomain(defaultDomain: Domain) {
  if (defaultDomain) {
    await LocalStorage.setItem(CacheKey.DEFAULT_DOMAIN, JSON.stringify(defaultDomain));
  }
}

export async function getDefaultDomain() {
  const cacheStr: string | undefined = await LocalStorage.getItem(CacheKey.DEFAULT_DOMAIN);
  if (cacheStr != undefined) {
    return JSON.parse(cacheStr) as Domain;
  } else {
    return undefined;
  }
}
