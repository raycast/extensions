import { showToast, Toast, getApplications } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { pingjoplin } from "./api";
import { JoplinBundleId, API_URL } from "./constants";
import type { CachePort, CachePath, NoteData } from "./types";

export const useGetPath = () => {
  const [path, setPath] = useCachedState<CachePath>("path", { cached: false, path: "/Applications/Joplin.app" });

  useEffect(() => {
    if (!path.cached) {
      getApplications().then((res) => {
        const joplinpath = res.filter((app) => app.bundleId === JoplinBundleId)[0].path;
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

export const useNoteFetch = (keyword: string) => {
  const [port, setPort] = useCachedState<CachePort>("port", { cached: false, port: 0 });
  const URL = API_URL(keyword, port.port);
  const { isLoading, data, error } = useFetch<NoteData>(URL, {
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
