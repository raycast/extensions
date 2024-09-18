import React from "react";
import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { authorize } from "../api/oauth";
import * as api from "../helpers/whoop.api";
import nodeFetch from "node-fetch";

export let whoopClient: typeof api | undefined;

export function withWhoopClient(component: JSX.Element) {
  const [x, forceRerender] = React.useState(0);

  React.useMemo(() => {
    (async function () {
      const accessToken = await authorize();

      api.defaults.headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      api.defaults.fetch = nodeFetch as unknown as typeof api.defaults.fetch;

      whoopClient = api;

      forceRerender(x + 1);
    })();
  }, []);

  if (!whoopClient) {
    if (environment.commandMode === "view") {
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withWhoopClient` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function getWhoopClient() {
  if (!whoopClient) {
    throw new Error("getWhoopClient must be used when authenticated");
  }

  return {
    whoopClient,
  };
}

export async function setWhoopClient() {
  const accessToken = await authorize();

  api.defaults.headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  api.defaults.fetch = nodeFetch as unknown as typeof api.defaults.fetch;

  whoopClient = api;
}
