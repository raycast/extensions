import { environment, List, MenuBarExtra } from "@raycast/api";
import { useMemo, useState } from "react";
import { authorize, getEmail } from "../api/oauth";

let token: string | null = null;
let email: string | undefined;

export function withGoogleAuth(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      try {
        token = await authorize();
        email = await getEmail();
        forceRerender(x + 1);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Something went wrong while authorizing");
      }
    })();
  }, []);

  if (!token) {
    if (environment.commandMode === "view") {
      return <List isLoading />;
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

export function getUserEmail(): string {
  if (!email) {
    throw new Error("getUserEmail must be used when authenticated");
  }

  return email;
}
