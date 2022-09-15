import { preferences } from "@raycast/api";
import { Cache } from "@raycast/api";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { SearchRepositoriesResponse, UserDataResponse } from "./types";

const octokit = new Octokit({ auth: preferences.token.value });
const cache = new Cache();
const CACHE_KEY = "USER_DATA";

const USERDATA_QUERY = `
query UserData {
  viewer {
    login
    organizations(first: 100) {
      nodes {
        login
      }
    }
  }
}`;

export function useUserData() {
  const [state, setState] = useState<{
    data?: UserDataResponse["viewer"];
    error?: Error;
    isLoading: boolean;
  }>({ isLoading: false });

  useEffect(() => {
    let isCanceled = false;

    async function fetchData() {
      setState((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const { viewer } = await octokit.graphql<UserDataResponse>(USERDATA_QUERY);

        if (!isCanceled) {
          setState((oldState) => ({ ...oldState, data: viewer }));
          cache.set(CACHE_KEY, JSON.stringify(viewer));
        }
      } catch (e) {
        console.log(e);
        if (!isCanceled) {
          setState((oldState) => ({
            ...oldState,
            error: e instanceof Error ? e : new Error("Something went wrong"),
          }));
        }
      } finally {
        if (!isCanceled) {
          setState((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      isCanceled = true;
    };
  }, []);

  return { data: JSON.parse(cache.get(CACHE_KEY) || "null"), ...state };
}
