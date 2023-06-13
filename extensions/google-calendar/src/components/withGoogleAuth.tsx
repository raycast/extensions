import { useMemo, useState } from "react";
import { authorize } from "../oauth/google";
import { Detail, MenuBarExtra, environment } from "@raycast/api";

let token: string | null = null;

export function withGoogleAuth(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  useMemo(() => {
    (async function () {
      token = await authorize();
      forceRerender(x + 1);
    })();
  }, []);

  if (!token) {
    if (environment.commandMode === "view") {
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withGoogleAuth` is only supported in `view` and `menu-bar` mode");
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
