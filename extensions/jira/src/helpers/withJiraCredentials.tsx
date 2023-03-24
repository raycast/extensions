import { Detail, environment, MenuBarExtra, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { useMemo, useState } from "react";

import { authorize } from "../api/oauth";
import { User } from "../api/users";

import { getErrorMessage } from "./errors";

type JiraCredentials = {
  cloudId: string;
  siteUrl: string;
  authorizationHeader: string;
  myself: User;
};

let jiraCredentials: JiraCredentials | null = null;

export function withJiraCredentials(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      try {
        const accessToken = await authorize();

        const sitesResponse = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });

        const sites = (await sitesResponse.json()) as { id: string; url: string }[];

        if (sites && sites.length > 0) {
          const site = sites[0];
          const authorizationHeader = `Bearer ${accessToken}`;

          const myselfResponse = await fetch(`https://api.atlassian.com/ex/jira/${site.id}/rest/api/3/myself`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          });

          const myself = (await myselfResponse.json()) as User;

          jiraCredentials = {
            cloudId: site.id,
            siteUrl: site.url,
            authorizationHeader,
            myself,
          };
        }

        forceRerender(x + 1);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed authenticating to Jira",
          message: getErrorMessage(error),
        });
      }
    })();
  }, []);

  if (!jiraCredentials) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withJiraCredentials` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function getJiraCredentials() {
  if (!jiraCredentials) {
    throw new Error("getJiraCredentials must be used when authenticated");
  }

  return jiraCredentials;
}
