import { Client } from "@notionhq/client";
import { Cache, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Evnt, Keystone, Project, ProjectGP, Timer } from "../interfaces/interfaceItems";
import {
  FetchActiveProjects,
  FetchActiveTimer,
  FetchAllProjects,
  FetchGeneralPilotProjects,
  FetchTodayEvents,
  FetchTodayKeystones,
} from "./FetchFunctions";
import { getAPIError } from "../tools/generalTools";
import { TE_Notion_undefined } from "../views/toasts/ErrorToasts";
import TimezoneHook from "../tools/TimezoneHook";

interface ApiIDs {
  project: string;
  event: string;
  link: string;
  keystone: string;
  timer: string;
  journal: string;
}

const cache = new Cache();

const useFetchGeneralPilot = (notion: Client | undefined) => {
  const [apiIDsState, setApiIDs] = useState<ApiIDs | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [todayEvents, setTodayEvents] = useState<Evnt[]>([]);
  const [todayKeystones, setTodayKeystones] = useState<Keystone[]>([]);
  const [activeTimer, setActiveTimer] = useState<Timer | null>({} as Timer);
  const [gpProjects, setGPProjects] = useState<ProjectGP[]>([]);

  const { untmDate } = TimezoneHook();

  const fetch = async (targets: string[], forceRefresh: boolean, apiIDs: ApiIDs) => {
    if (notion === undefined) return;

    const today = untmDate(new Date(new Date().toISOString().slice(0, 10))).toISOString();

    const fetchedAllProjects = await FetchAllProjects(targets, apiIDs.project, forceRefresh, notion);
    if (typeof fetchedAllProjects === "string") {
      showToast({ title: getAPIError(fetchedAllProjects, "Project"), style: Toast.Style.Failure });
      return;
    }
    setAllProjects(fetchedAllProjects as Project[]);

    const fetchedActiveProjects = await FetchActiveProjects(targets, apiIDs?.project as string, forceRefresh, notion);
    if (typeof fetchedActiveProjects === "string") {
      showToast({ title: getAPIError(fetchedActiveProjects, "Project"), style: Toast.Style.Failure });
      return;
    }

    const fetchedTodayEvents = await FetchTodayEvents(targets, apiIDs.event, forceRefresh, today, notion);
    if (typeof fetchedTodayEvents === "string") {
      showToast({ title: getAPIError(fetchedTodayEvents, "Event"), style: Toast.Style.Failure });
      return;
    }
    setTodayEvents(fetchedTodayEvents);

    const fetchedKeystones = await FetchTodayKeystones(targets, apiIDs.keystone, forceRefresh, today, notion);
    if (typeof fetchedKeystones === "string") {
      showToast({ title: getAPIError(fetchedKeystones, "Keystone"), style: Toast.Style.Failure });
      return;
    }
    setTodayKeystones(fetchedKeystones);

    const fetchedActiveTimer = await FetchActiveTimer(targets, apiIDs.timer, forceRefresh, notion);
    if (typeof fetchedActiveTimer === "string") {
      showToast({ title: getAPIError(fetchedActiveTimer, "Timer"), style: Toast.Style.Failure });
      return;
    }
    setActiveTimer(fetchedActiveTimer);

    const fetchedGPProjects = await FetchGeneralPilotProjects(
      targets,
      apiIDs.journal,
      apiIDs.keystone,
      fetchedActiveProjects as Project[],
      forceRefresh,
      notion,
    );
    if (typeof fetchedGPProjects === "string") {
      showToast({ title: getAPIError(fetchedGPProjects, "Projects"), style: Toast.Style.Failure });
      return;
    }
    setGPProjects(fetchedGPProjects === null ? [] : fetchedGPProjects);

    setIsLoading(false);
  };

  const refresh = (filters: string[]) => {
    setIsLoading(true);
    fetch(filters, true, apiIDsState as ApiIDs);
  };

  const clearRefresh = () => {
    cache.clear();
    refresh(["all"]);
  };

  const getApiIDs = async () => {
    const pAPIID = (await LocalStorage.getItem("project")) as string;
    const tAPIID = (await LocalStorage.getItem("timer")) as string;
    const eAPIID = (await LocalStorage.getItem("event")) as string;
    const kAPIID = (await LocalStorage.getItem("keystone")) as string;
    const jAPIID = (await LocalStorage.getItem("journal")) as string;
    const lAPIID = (await LocalStorage.getItem("link")) as string;

    const newApiIDs: ApiIDs = {
      keystone: kAPIID,
      event: eAPIID,
      project: pAPIID,
      link: lAPIID,
      journal: jAPIID,
      timer: tAPIID,
    };
    setApiIDs(newApiIDs);
    return newApiIDs;
  };

  useEffect(() => {
    if (notion === undefined) {
      TE_Notion_undefined();
      return;
    }
    setIsLoading(true);
    getApiIDs();
  }, [notion]);

  useEffect(() => {
    if (apiIDsState === undefined) return;
    firstFetch(apiIDsState);
  }, [apiIDsState]);

  const firstFetch = async (ids: ApiIDs) => {
    const bool = await checkForToday();
    fetch(["all"], bool, ids);
  };

  const checkForToday = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const lastToday = await LocalStorage.getItem("todayMenubar");
    if (lastToday === today) {
      return false;
    } else {
      return true;
    }
  };

  return { isLoading, refresh, clearRefresh, allProjects, todayEvents, todayKeystones, gpProjects, activeTimer };
};

export default useFetchGeneralPilot;
