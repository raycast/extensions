import { showToast, Toast, getApplications } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { pingjoplin } from "./api";
import { JoplinBundleId, DETAIL_API_URL, SEARCH_API_URL } from "./constants";
import type { CachePort, CachePath, NoteDetailData, NoteList } from "./types";

export const useGetPath = () => {
  const [path, setPath] = useCachedState<CachePath>("path", { cached: false, path: "/Applications/Joplin.app" });

  useEffect(() => {
    if (!path.cached) {
      getApplications().then((res) => {
        const joplinApp = res.filter((app) => app.bundleId === JoplinBundleId)[0];
        const joplinpath = joplinApp ? joplinApp.path : "/Applications/Joplin.app";
        setPath(() => ({ cached: true, path: joplinpath }));
      });
    }
  }, []);
};

export const usePingJoplin = () => {
  const [port, setPort] = useCachedState<CachePort>("port", { cached: false, port: 0 });

  useEffect(() => {
    if (!port.cached || port.port == 0) {
      (async () => {
        const pingPort = await pingjoplin();
        setPort(() => ({ cached: true, port: pingPort }));
      })();
    }
  }, []);

  return port;
};

export const useNoteListFetch = (keyword: string) => {
  const [port, setPort] = useCachedState<CachePort>("port", { cached: false, port: 0 });
  const URL = SEARCH_API_URL(keyword, port.port);
  const { isLoading, data, error } = useFetch<NoteList>(URL, {
    keepPreviousData: true,
    onError: () => (
      showToast({
        style: Toast.Style.Failure,
        title: "Error: Not fetch notes",
        message: "Unable to communicate with joplin server",
      }),
      setPort(() => ({ cached: false, port: 0 }))
    ),
  });

  return { isLoading, data, error };
};

export const useNoteDetailFetch = (id: string) => {
  const [port, setPort] = useCachedState<CachePort>("port", { cached: false, port: 0 });
  const URL = DETAIL_API_URL(id, port.port);
  const { isLoading, data, error } = useFetch<NoteDetailData>(URL, {
    keepPreviousData: true,
    onError: () => (
      showToast({
        style: Toast.Style.Failure,
        title: "Error: Not fetch notes",
        message: "Unable to communicate with joplin server",
      }),
      setPort(() => ({ cached: false, port: 0 }))
    ),
  });

  return { isLoading, data, error };
};
