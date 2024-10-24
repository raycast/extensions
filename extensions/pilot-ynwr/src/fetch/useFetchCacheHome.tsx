import { Client } from "@notionhq/client";
import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import TimezoneHook from "../tools/TimezoneHook";
import {
  QueryFetchActiveProjects,
  QueryFetchAllProjects,
  QueryFetchEvents,
  QueryFetchGPProjects,
  QueryFetchKeystones,
  QueryFetchTimers,
} from "./QueryFetch";
import { Evnt, Keystone, Project, ProjectGP, Timer } from "../interfaces/interfaceItems";

const useFetchCacheHome = (notion: Client, linked: boolean) => {
  const { untmDate } = TimezoneHook();

  const initData = {
    allProjects: [] as Project[],
    todayEvents: [] as Evnt[],
    todayKeystones: [] as Keystone[],
    gpProjects: [] as ProjectGP[],
    activeTimer: {} as Timer,
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

    const allProjects = await QueryFetchAllProjects(Project_APIID, notion);
    const activesProject = await QueryFetchActiveProjects(Project_APIID, notion);
    const todayEvents = await QueryFetchEvents(Events_APIID, notion, today, true);
    const todayKeystones = await QueryFetchKeystones(Keystones_APIID, notion, today, true);
    const activeTimer = (await QueryFetchTimers(Timers_APIID, notion, true)) as Timer;
    const gpProjects = await QueryFetchGPProjects(Journals_APIID, Keystones_APIID, activesProject, notion);

    return {
      allProjects,
      todayEvents,
      todayKeystones,
      gpProjects,
      activeTimer,
    };
  };

  const { data, isLoading, revalidate } = useCachedPromise(fetch, [notion], {
    initialData: initData,
    keepPreviousData: true,
  });

  return {
    isLoading,
    refresh: revalidate,
    allProjects: data.allProjects,
    todayEvents: data.todayEvents,
    todayKeystones: data.todayKeystones,
    gpProjects: data.gpProjects,
    activeTimer: data.activeTimer,
  };
};

export default useFetchCacheHome;
