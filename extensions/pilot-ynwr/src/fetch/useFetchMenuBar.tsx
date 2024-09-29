import { Client } from "@notionhq/client";

import { useEffect, useState } from "react";
import { FetchActiveProjects, FetchActiveTimer, FetchTodayEvents, FetchTodayKeystones } from "./FetchFunctions";
import { Evnt, Keystone, Pref, Project, Timer } from "../interfaces/interfaceItems";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getAPIError } from "../tools/generalTools";
import TimezoneHook from "../tools/TimezoneHook";

interface APIIDS {
  project: string;
  timer: string;
  keystone: string;
  event: string;
}

const useFetchMenuBar = (notion: Client | undefined) => {
  const [apiIDs, setApiIDS] = useState<APIIDS | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [todayEvents, setTodayEvents] = useState<Evnt[]>([]);
  const [todayKeystones, setTodayKeystones] = useState<Keystone[]>([]);

  const { untmDate } = TimezoneHook();

  const getApiIDS = async () => {
    const pref = getPreferenceValues<Pref>();
    const newApiIDs: APIIDS = {
      project: pref.projectAPIID,
      timer: pref.timerAPIID,
      event: pref.eventAPIID,
      keystone: pref.keystoneAPIID,
    };
    setApiIDS(newApiIDs);
  };

  const fetch = async (targets: string[], refresh: boolean, apiIDs: APIIDS) => {
    if (notion === undefined) return;
    const today = untmDate(new Date(new Date().toISOString().slice(0, 10))).toISOString();

    const fetchedProjects = await FetchActiveProjects(targets, apiIDs?.project as string, refresh, notion);
    if (typeof fetchedProjects === "string") {
      showToast({ title: getAPIError(fetchedProjects, "Project"), style: Toast.Style.Failure });
      return;
    }

    const fetchedTimer = await FetchActiveTimer(targets, apiIDs?.timer as string, refresh, notion);
    if (typeof fetchedTimer === "string") {
      showToast({ title: getAPIError(fetchedTimer, "Timer"), style: Toast.Style.Failure });
      return;
    }

    const fetchedEvent = await FetchTodayEvents(targets, apiIDs?.event as string, refresh, today, notion);
    if (typeof fetchedEvent === "string") {
      showToast({ title: getAPIError(fetchedEvent, "Event"), style: Toast.Style.Failure });
      return;
    }
    const fetchedKeystone = await FetchTodayKeystones(targets, apiIDs?.keystone as string, refresh, today, notion);
    if (typeof fetchedKeystone === "string") {
      showToast({ title: getAPIError(fetchedKeystone, "Keystone"), style: Toast.Style.Failure });
      return;
    }

    setProjects(fetchedProjects);
    setTimer(fetchedTimer);
    setTodayEvents(fetchedEvent);
    setTodayKeystones(fetchedKeystone);

    setIsLoading(false);
  };

  const refresh = async (targets: string[]) => {
    setIsLoading(true);
    fetch(targets, true, apiIDs as APIIDS);
  };

  useEffect(() => {
    if (notion === undefined) return;
    setIsLoading(true);
    getApiIDS();
  }, [notion]);

  useEffect(() => {
    if (apiIDs === undefined) return;
    fetch(["all"], false, apiIDs);
  }, [apiIDs]);

  return { isLoading, refresh, timer, todayEvents, todayKeystones, projects };
};

export default useFetchMenuBar;
