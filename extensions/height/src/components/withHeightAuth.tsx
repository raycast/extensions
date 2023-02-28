import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { authorize } from "../api/oauth";

let token: string | null = null;

export function withHeightAuth(component: JSX.Element) {
  (async function () {
    token = await authorize();
  })();

  if (!token) {
    if (environment.commandMode === "view") {
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
