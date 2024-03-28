import { environment, List, MenuBarExtra, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import React, { useMemo, useState } from "react";

import { authorize } from "../api/oauth";
import { User } from "../api/users";

import { getErrorMessage } from "./errors";

type JiraCredentials = {
  siteUrl: string;
  authorizationHeader: string;
  myself: User;
};

let jiraCredentials: JiraCredentials | null = null;
const prefs = getPreferenceValues();


export function withJiraCredentials(component: JSX.Element) {
  const [x, forceRerender] = useState(0);
  const [query, setQuery] = useState("");

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      try {
        /* const accessToken = process.env.HELLO_JIRA_TOKEN */
        const accessToken = prefs.token;
        const workspace = prefs.workspace_url;
        const email = prefs.email;

        const authorizationHeader = `Basic ${btoa(`${email}:${accessToken}`)}`;

        const myselfResponse = await fetch(
          `https://${workspace}/rest/api/3/myself`,
          {
            headers: {
              Authorization: authorizationHeader,
              Accept: "application/json",
            },
          },
        );

        const myself = (await myselfResponse.json()) as User;

        jiraCredentials = {
          siteUrl: workspace,
          authorizationHeader,
          myself,
        };

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
      return <List isLoading onSearchTextChange={setQuery} searchText={query} />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withJiraCredentials` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return React.cloneElement(component, { query: query });
}

export function getJiraCredentials() {
  if (!jiraCredentials) {
    throw new Error("getJiraCredentials must be used when authenticated");
  }

  return jiraCredentials;
}
