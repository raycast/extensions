import { Client } from "@notionhq/client";
import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import TimezoneHook from "../tools/TimezoneHook";
import { QueryFetchActiveProjects, QueryFetchKeystones, QueryFetchTodos } from "./QueryFetch";

const useFetchCachTaskManager = (notion: Client, linked: boolean) => {
  const { untmDate } = TimezoneHook();

  const initData = {
    projects: [],
    keystones: [],
    todos: [],
  };

  const fetch = async (notion: Client) => {
    if (linked === false) {
      return initData;
    }
    const today = untmDate(new Date(new Date().toISOString().slice(0, 10))).toISOString();

    const Project_APIID = (await LocalStorage.getItem("Projects")) as string;
    const Todos_APIID = (await LocalStorage.getItem("Todos")) as string;
    const Keystones_APIID = (await LocalStorage.getItem("Keystones")) as string;

    const projects = await QueryFetchActiveProjects(Project_APIID, notion);
    const keystones = await QueryFetchKeystones(Keystones_APIID, notion, today, false);
    const todos = await QueryFetchTodos(Todos_APIID, notion);

    return { projects, keystones, todos };
  };

  const { data, isLoading, revalidate } = useCachedPromise(fetch, [notion], {
    initialData: initData,
  });

  return { projects: data.projects, keystones: data.keystones, todos: data.todos, isLoading, refresh: revalidate };
};

export default useFetchCachTaskManager;
