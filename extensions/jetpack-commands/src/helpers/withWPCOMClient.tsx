import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { useMemo, useState } from "react";
import { authorize } from "../api/oauth";
import WPCOM from "wpcom";

let client: typeof WPCOM | undefined;
export function withWPCOMClient(component: JSX.Element) {
  const [, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      const token = await authorize();
      client = new WPCOM(token);
      forceRerender((prev) => prev + 1);
    })();
  }, []);

  if (!client) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withWPCOMClient` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function useWPCOMClient() {
  if (!client) {
    throw new Error("WPCOM client not initialized");
  }

  return { wp: client };
}
