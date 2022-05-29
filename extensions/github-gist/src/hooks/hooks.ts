import { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { Gist, octokit, requestGist } from "../util/gist-utils";
import { commonPreferences, isEmpty } from "../util/utils";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
};

export const showGists = (gistParams: { route: string; page: number }, refresh: number) => {
  const { route, page } = gistParams;
  const { perPage } = commonPreferences();
  const [gists, setGists] = useState<Gist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      if (isEmpty(route)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const _gists = await requestGist(route, page, perPage);
      page === 1 ? setGists(_gists) : setGists([...gists, ..._gists]);
    } catch (e) {
      await showToast(Toast.Style.Failure, String(e));
    }
    setLoading(false);
  }, [route, page, refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { gists: gists, loading: loading };
};

export const getGistContent = (rawUrl: string) => {
  const [gistFileContent, setGistFileContent] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      if (!isEmpty(rawUrl)) {
        setGistFileContent("");
        const { data } = await octokit.request(`GET ${rawUrl}`);
        setGistFileContent(data);
      }
    } catch (e) {
      await showToast(Toast.Style.Failure, String(e));
    }
  }, [rawUrl]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { gistFileContent: gistFileContent };
};
