import { useCachedPromise } from "@raycast/utils";
import { Client } from "@notionhq/client";
import { LocalStorage } from "@raycast/api";
import { QueryFetchActiveProjects, QueryFetchEvents, QueryFetchKeystones } from "./QueryFetch";
import TimezoneHook from "../tools/TimezoneHook";

const useFetchCacheCalendar = (notion: Client, linked: boolean) => {
  const { untmDate } = TimezoneHook();

  const initData = {
    projects: [],
    events: [],
    keystones: [],
  };

  const fetch = async (notion: Client) => {
    if (linked === false) {
      return initData;
    }
    const today = untmDate(new Date(new Date().toISOString().slice(0, 10))).toISOString();

    const Project_APIID = (await LocalStorage.getItem("Projects")) as string;
    const Events_APIID = (await LocalStorage.getItem("Events")) as string;
    const Keystones_APIID = (await LocalStorage.getItem("Keystones")) as string;

    const projects = await QueryFetchActiveProjects(Project_APIID, notion);
    const events = await QueryFetchEvents(Events_APIID, notion, today, false);
    const keystones = await QueryFetchKeystones(Keystones_APIID, notion, today, false);

    return {
      projects,
      events,
      keystones,
    };
  };

  const { data, isLoading, revalidate } = useCachedPromise(fetch, [notion], {
    initialData: initData,
    keepPreviousData: true,
  });

  return {
    isLoading,
    refresh: revalidate,
    projects: data.projects,
    events: data.events,
    keystones: data.keystones,
  };
};

export default useFetchCacheCalendar;
