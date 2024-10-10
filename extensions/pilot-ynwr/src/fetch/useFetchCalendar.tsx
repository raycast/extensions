import { Cache, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Client } from "@notionhq/client";
import { Evnt, Keystone, Project } from "../interfaces/interfaceItems";

import { FetchActiveProjects, FetchEvents, FetchKeystones } from "./FetchFunctions";
import { getAPIError } from "../tools/generalTools";
import TimezoneHook from "../tools/TimezoneHook";

interface ApiIDS {
  project: string;
  event: string;
  keystone: string;
}

const cache = new Cache();

const useFetchCalendar = (notion: Client | undefined) => {
  //STATES
  const [apiIDs, setApiIDs] = useState<ApiIDS | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Evnt[]>([]);
  const [keystones, setKeystones] = useState<Keystone[]>([]);

  const { untmDate } = TimezoneHook();

  const getApiIDs = async () => {
    const pAPIID = (await LocalStorage.getItem("project")) as string;
    const eAPIID = (await LocalStorage.getItem("event")) as string;
    const kAPIID = (await LocalStorage.getItem("keystone")) as string;

    const newApiIDS: ApiIDS = {
      project: pAPIID,
      event: eAPIID,
      keystone: kAPIID,
    };
    setApiIDs(newApiIDS);
  };

  const refresh = (targets: string[]) => {
    setIsLoading(true);
    fetch(targets, true);
  };

  const clearRefresh = () => {
    cache.clear();
    refresh(["all"]);
  };

  const fetch = async (targets: string[], forceRefresh: boolean) => {
    if (notion === undefined) return;
    const today = untmDate(new Date(new Date().toISOString().slice(0, 10))).toISOString();

    const fetchedProjects = await FetchActiveProjects(targets, apiIDs?.project as string, forceRefresh, notion);
    if (typeof fetchedProjects === "string") {
      showToast({ title: getAPIError(fetchedProjects, "Project"), style: Toast.Style.Failure });
      return;
    }
    setProjects(fetchedProjects);

    const fetchedKeystones = await FetchKeystones(targets, apiIDs?.keystone as string, forceRefresh, today, notion);
    if (typeof fetchedKeystones === "string") {
      showToast({ title: getAPIError(fetchedKeystones, "Keystone"), style: Toast.Style.Failure });
      return;
    }
    setKeystones(fetchedKeystones);

    const fetchedEvents = await FetchEvents(targets, apiIDs?.event as string, forceRefresh, today, notion);
    if (typeof fetchedEvents === "string") {
      showToast({ title: getAPIError(fetchedEvents, "Event"), style: Toast.Style.Failure });
      return;
    }
    setEvents(fetchedEvents);

    setIsLoading(false);
  };

  useEffect(() => {
    if (notion === undefined) return;
    setIsLoading(true);
    getApiIDs();
  }, [notion]);

  useEffect(() => {
    if (apiIDs === undefined) return;
    fetch(["all"], false);
  }, [apiIDs]);

  return { isLoading, clearRefresh, refresh, projects, events, keystones };
};

export default useFetchCalendar;
