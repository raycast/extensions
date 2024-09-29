import { Client } from "@notionhq/client";
import { Cache, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Journal, Pref, Project } from "../interfaces/interfaceItems";
import { FetchActiveProjects, FetchJournals } from "./FetchFunctions";
import { getAPIError } from "../tools/generalTools";

interface ApiIDS {
  project: string;
  journal: string;
}

const cache = new Cache();

const useFetchJournals = (notion: Client | undefined) => {
  //STATES
  const [apiIDs, setApiIDs] = useState<ApiIDS | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [journals, setJournals] = useState<Journal[] | null>([]);

  const getApiIDs = async () => {
    const pref = getPreferenceValues<Pref>();
    const newApiIDs: ApiIDS = {
      journal: (pref.journalAPIID),
      project: (pref.projectAPIID),
    };
    setApiIDs(newApiIDs);
  };

  useEffect(() => {
    if (notion === undefined) return;
    setIsLoading(true);
    getApiIDs();
  }, [notion]);

  useEffect(() => {
    if (apiIDs === undefined) return;
    fetch(["all"], true);
  }, [apiIDs]);

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

    const fetchedProjects = await FetchActiveProjects(targets, apiIDs?.project as string, forceRefresh, notion);
    if (typeof fetchedProjects === "string") {
      showToast({ title: getAPIError(fetchedProjects, "Project"), style: Toast.Style.Failure });
      return;
    }
    setProjects(fetchedProjects as Project[]);

    const fetchedJournals = await FetchJournals(targets, apiIDs?.journal as string, forceRefresh, notion);
    if (typeof fetchedProjects === "string") {
      showToast({ title: getAPIError(fetchedProjects, "Links"), style: Toast.Style.Failure });
      return;
    }
    setJournals(fetchedJournals as Journal[]);

    setIsLoading(false);
  };

  return { isLoading, clearRefresh, refresh, journals, projects };
};

export default useFetchJournals;
