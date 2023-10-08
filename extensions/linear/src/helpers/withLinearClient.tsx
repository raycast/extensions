import { useMemo, useState } from "react";
import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { LinearClient, LinearGraphQLClient } from "@linear/sdk";

import { authorize } from "../api/oauth";

let linearClient: LinearClient | null = null;

export function withLinearClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      const accessToken = await authorize();

      linearClient = new LinearClient({ accessToken });

      forceRerender(x + 1);
    })();
  }, []);

  if (!linearClient) {
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

export function getLinearClient(): { linearClient: LinearClient; graphQLClient: LinearGraphQLClient } {
  if (!linearClient) {
    throw new Error("getLinearClient must be used when authenticated");
  }

  return {
    linearClient,
    graphQLClient: linearClient.client,
  };
}
