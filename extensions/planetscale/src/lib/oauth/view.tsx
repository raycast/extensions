import { useMemo, useState } from "react";
import { Detail, environment, MenuBarExtra } from "@raycast/api";

import { createPlanetScaleClient, PlanetScaleClient } from "../api";
import { authorize } from "./client";

let planetScaleClient: PlanetScaleClient | null = null;

export function withPlanetScaleClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      const { accessToken, idToken } = await authorize();
      planetScaleClient = createPlanetScaleClient(`${idToken}:${accessToken}`);
      forceRerender(x + 1);
    })();
  }, []);

  if (!planetScaleClient) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withPlanetScaleClient` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function usePlanetScaleClient(): PlanetScaleClient {
  if (!planetScaleClient) {
    throw new Error("getLinearClient must be used when authenticated");
  }
  return planetScaleClient;
}

/**
 * Makes sure that we have a authenticated PlanetScale client available in the children
 */
export function View({ children }: { children: JSX.Element }) {
  return withPlanetScaleClient(children);
}
