import { Cache, environment, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";
import { preferences } from "./preferences";
import { ErrorResponseBody, Program, serviceIds, TVSchedule } from "./types";
import { getFormattedDate } from "./utils";

const END_POINT = "https://api.nhk.or.jp/v2/pg/list";
const cache = new Cache();

export default async function Command() {
  const tempPrevCache = getPrevCacheAndClear();

  try {
    await storeWeeklyProgramsCache();
    await updateCommandMetadata({ subtitle: `Last Update: ${getFormattedDate(new Date(), "YYYY-MM-DD HH:mm")}` });
    if (environment.launchType === "userInitiated") {
      await showToast({
        style: Toast.Style.Success,
        title: "Successfully fetched data",
      });
    }
  } catch (error) {
    if (environment.launchType === "userInitiated") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch data",
        message: error instanceof Error ? error.message : "An error occurred while fetching data.",
      });
    }

    // restore prev data
    serviceIds.forEach((sid) => {
      cache.set(sid, JSON.stringify(tempPrevCache[sid]));
    });
  }
}

async function storeWeeklyProgramsCache(): Promise<void> {
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const jstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    jstDate.setDate(jstDate.getDate() + i);
    return jstDate.toISOString().split("T")[0];
  });

  for (const date of weekDates) {
    const response = await fetch(`${END_POINT}/${preferences.area}/tv/${date}.json?key=${preferences.apiKey}`);

    if (!response.ok) {
      const errorResponse = (await response.json()) as ErrorResponseBody;
      throw new Error(errorResponse.error.message);
    }

    const data = (await response.json()) as TVSchedule;

    serviceIds.forEach((sid) => {
      if (sid === "all") {
        return;
      }
      const existed = JSON.parse(cache.get(sid) ?? "[]") as Program[];
      cache.set(sid, JSON.stringify([...existed, ...data.list[sid]]));
    });
  }
}

function getPrevCacheAndClear() {
  const prevCache: { [key: string]: Program[] } = {};
  serviceIds.forEach((sid) => {
    const data = JSON.parse(cache.get(sid) ?? "[]") as Program[];
    prevCache[sid] = data;
    return data;
  });
  serviceIds.forEach(cache.remove);
  return prevCache;
}
