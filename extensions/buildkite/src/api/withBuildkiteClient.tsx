import { GraphQLClient } from "graphql-request";
import { useMemo, useState } from "react";
import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { getSdk } from "../generated/graphql";
import getPreferences from "../utils/preferences";

let buildkite: ReturnType<typeof getSdk> | null = null;

export function withBuildkiteClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      const { token } = getPreferences();

      buildkite = getSdk(
        new GraphQLClient("https://graphql.buildkite.com/v1", {
          headers: { authorization: `Bearer ${token}` },
        }),
      );

      forceRerender(x + 1);
    })();
  }, []);

  if (!buildkite) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withBuildkiteClient` is only supported in `view` and `menu-bar` mode");

      return null;
    }
  }

  return component;
}

export function getBuildkiteClient() {
  if (!buildkite) {
    throw new Error("getBuildkiteClient must be used when authenticated");
  }

  return buildkite;
}
