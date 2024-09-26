import { Cache, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Client } from "@notionhq/client";
import { Keystone, Pref, Project, Todo } from "../interfaces/interfaceItems";
import { FetchActiveProjects, FetchedTodos, FetchKeystones } from "./FetchFunctions";
import { getAPIError, getAPIidFromLink } from "../tools/generalTools";
import TimezoneHook from "../tools/TimezoneHook";

interface ApiIDS {
  project: string;
  todo: string;
  keystone: string;
}

const cache = new Cache();

const useFetchTaskManagement = (notion: Client | undefined) => {
  //STATES
  const [apiIDs, setApiIDs] = useState<ApiIDS | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [keystones, setKeystones] = useState<Keystone[]>([]);

  const { untmDate } = TimezoneHook();

  const getApiIDs = async () => {
    const pref = getPreferenceValues<Pref>();
    const newApiIDS: ApiIDS = {
      project: getAPIidFromLink(pref.projectAPIID),
      todo: getAPIidFromLink(pref.todoAPIID),
      keystone: getAPIidFromLink(pref.keystoneAPIID),
    };
    setApiIDs(newApiIDS);
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

  const fetch = async (targets: string[], forceRefresh: boolean) => {
    if (notion == undefined) return;
    const today = untmDate(new Date(new Date().toISOString().slice(0, 10))).toISOString();

    const fetchedProjects = await FetchActiveProjects(targets, apiIDs?.project as string, forceRefresh, notion);
    if (typeof fetchedProjects === "string") {
      showToast({ title: getAPIError(fetchedProjects, "Project"), style: Toast.Style.Failure });
      return;
    }
    setProjects(fetchedProjects as Project[]);

    const fetchedKeystones = await FetchKeystones(targets, apiIDs?.keystone as string, forceRefresh, today, notion);
    if (typeof fetchedKeystones === "string") {
      showToast({ title: getAPIError(fetchedKeystones, "Keystone"), style: Toast.Style.Failure });
      return;
    }
    setKeystones(fetchedKeystones as Keystone[]);

    const fetchedTodos = await FetchedTodos(targets, apiIDs?.todo as string, forceRefresh, notion);
    if (typeof fetchedTodos === "string") {
      showToast({ title: getAPIError(fetchedTodos, "Todos"), style: Toast.Style.Failure });
      return;
    }
    setTodos(fetchedTodos as Todo[]);

    setIsLoading(false);
  };

  const refresh = (targets: string[]) => {
    setIsLoading(true);
    fetch(targets, true);
  };

  const clearRefresh = () => {
    cache.clear();
    refresh(["all"]);
  };

  return { isLoading, clearRefresh, setIsLoading, refresh, projects, todos, keystones };
};

export default useFetchTaskManagement;
