import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { useMemo, useState } from "react";

import { authorize } from "@/api/oauth";

let token: string | null = null;

export function withHeightAuth(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      token = await authorize();

      forceRerender(x + 1);
    })();
  }, []);

  if (!token) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withHeightAuth` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function getOAuthToken(): string {
  if (!token) {
    throw new Error("getOAuthToken must be used when authenticated");
  }

  return token;
}
