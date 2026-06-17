import { Icon } from "@raycast/api";
import fetch from "node-fetch";
import { SocialTrend, TenHotRes, Trend } from "../types/types";
import { showTrendsTitle, trendsNumber } from "../types/preferences";

export const getNumberIcon = (index: number) => {
  const numberStr = index < 10 ? "0" + index : index.toString();
  return `number-${numberStr}-16` as Icon;
};

export const isEmpty = (str: string | undefined): boolean => {
  return typeof str === "undefined" || str === "";
};

export async function fetchTrend(api: string) {
  return await fetch(api)
    .then((response) => response.json())
    .then((res) => {
      return (res as TenHotRes).data;
    });
}

export function getMenubarTitle(socialTrend: SocialTrend[]) {
  if (showTrendsTitle && socialTrend.length > 0 && socialTrend[0].data.length > 0) {
    return socialTrend[0].data[0].name;
  } else {
    return undefined;
  }
}

export function spliceTrends(socialTrend: Trend[], count: number = parseInt(trendsNumber)) {
  return [...socialTrend].splice(0, count);
}
