import { Detail, environment, getPreferenceValues, MenuBarExtra } from "@raycast/api";
import axios, { AxiosInstance } from "axios";
import { useMemo, useState } from "react";

import { authorize } from "../oauth";

let todoistApi: AxiosInstance | null = null;
let todoistRestApi: AxiosInstance | null = null;

export async function initializeApi() {
  const { token } = getPreferenceValues<Preferences>();

  const accessToken = token || (await authorize());

  todoistApi = axios.create({
    baseURL: "https://api.todoist.com/sync/v9",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  todoistRestApi = axios.create({
    baseURL: "https://api.todoist.com/rest/v2",
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

export function withTodoistApi(component: JSX.Element) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMemo(() => {
    (async function () {
      await initializeApi();

      forceRerender(x + 1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!todoistApi) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withTodoistApi` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function getTodoistApi() {
  if (!todoistApi) {
    throw new Error("getTodoistApi must be used when authenticated");
  }

  return todoistApi;
}

export function getTodoistRestApi() {
  if (!todoistRestApi) {
    throw new Error("getTodoistApi must be used when authenticated");
  }

  return todoistRestApi;
}
