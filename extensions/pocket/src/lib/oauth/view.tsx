import { PocketClient } from "../api";
import { JSX, useMemo, useState } from "react";
import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { createPocketClient } from "./client";

let pocketClient: PocketClient | null = null;

export function withPocketClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      pocketClient = await createPocketClient();
      forceRerender(x + 1);
    })();
  }, []);

  if (!pocketClient) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withLinearClient` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function usePocketClient(): PocketClient {
  if (!pocketClient) {
    throw new Error("getPocketClient must be used when authenticated");
  }
  return pocketClient;
}

export function View({ children }: { children: JSX.Element }) {
  return withPocketClient(children);
}
