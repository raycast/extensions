import { useEffect, useState } from "react";
import { Detail } from "@raycast/api";
import { LinearClient, LinearGraphQLClient } from "@linear/sdk";

import { authorize } from "../api/oauth";

let linearClient: LinearClient | null = null;

export function withLinearClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  useEffect(() => {
    (async function () {
      const accessToken = await authorize();

      linearClient = new LinearClient({ accessToken });

      forceRerender(x + 1);
    })();
  }, []);

  if (!linearClient) {
    // Using the <List /> component makes the placeholder buggy
    return <Detail isLoading />;
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
