import { useCachedPromise } from "@raycast/utils";
import { Client } from "@notionhq/client";
import { LocalStorage } from "@raycast/api";
import { QueryFetchActiveProjects, QueryFetchJournals } from "./QueryFetch";

const useFetchCacheJournals = (notion: Client, linked: boolean) => {
  const initData = {
    projects: [],
    journals: [],
  };

  const fetch = async (notion: Client) => {
    if (linked === false) {
      return initData;
    }

    const Project_APIID = (await LocalStorage.getItem("Projects")) as string;
    const Journals_APIID = (await LocalStorage.getItem("Journals")) as string;

    const projects = await QueryFetchActiveProjects(Project_APIID, notion);
    const journals = await QueryFetchJournals(Journals_APIID, notion);

    return {
      projects,
      journals,
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
    journals: data.journals,
  };
};

export default useFetchCacheJournals;
