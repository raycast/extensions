import { useCachedPromise } from "@raycast/utils";
import { Client } from "@notionhq/client";
import { LocalStorage } from "@raycast/api";
import {
  QueryFetchActiveProjects,
  QueryFetchEvents,
  QueryFetchJournals,
  QueryFetchKeystones,
  QueryFetchTimers,
} from "./QueryFetch";
import TimezoneHook from "../tools/TimezoneHook";
import { Evnt, Journal, Keystone, Project, Timer } from "../interfaces/interfaceItems";

const useFetchCacheMenuBar = (notion: Client, linked: boolean) => {
  const { untmDate } = TimezoneHook();

  const initData = {
    projects: [] as Project[],
    events: [] as Evnt[],
    keystones: [] as Keystone[],
    activeTimer: {} as Timer,
    journals: [] as Journal[],
  };

  const fetch = async (notion: Client) => {
    if (linked === false) {
      return initData;
    }

    const today = untmDate(new Date(new Date().toISOString().slice(0, 10))).toISOString();

    const Project_APIID = (await LocalStorage.getItem("Projects")) as string;
    const Timers_APIID = (await LocalStorage.getItem("Timers")) as string;
    const Events_APIID = (await LocalStorage.getItem("Events")) as string;
    const Keystones_APIID = (await LocalStorage.getItem("Keystones")) as string;
    const Journals_APIID = (await LocalStorage.getItem("Journals")) as string;

    const projects = await QueryFetchActiveProjects(Project_APIID, notion);
    const activeTimer = (await QueryFetchTimers(Timers_APIID, notion, true)) as Timer;
    const events = await QueryFetchEvents(Events_APIID, notion, today, true);
    const keystones = await QueryFetchKeystones(Keystones_APIID, notion, today, true);
    const journals = await QueryFetchJournals(Journals_APIID, notion);

    return {
      projects,
      activeTimer,
      events,
      keystones,
      journals,
    };
  };

  const { data, isLoading, revalidate } = useCachedPromise(fetch, [notion], { initialData: initData });

  return {
    isLoading,
    refresh: revalidate,
    projects: data.projects,
    todayEvents: data.events,
    todayKeystones: data.keystones,
    timer: data.activeTimer,
    journals: data.journals,
  };
};

export default useFetchCacheMenuBar;
