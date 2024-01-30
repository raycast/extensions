import { Action, ActionPanel, environment, List, MenuBarExtra, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import React, { useMemo, useState } from "react";

import { authorize } from "../api/oauth";
import { User } from "../api/users";

import { getErrorMessage } from "./errors";

type Site = {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
};

type JiraCredentials = {
  cloudId: string;
  siteUrl: string;
  authorizationHeader: string;
  myself: User;
  sites: Site[];
};

let jiraCredentials: JiraCredentials | null = null;
let userSelectedSite: boolean = false;

export function withJiraCredentials(component: JSX.Element) {
  const [x, forceRerender] = useState(0);
  const [query, setQuery] = useState("");

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

        const sites = (await sitesResponse.json()) as Site[];

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
            sites,
            cloudId: site.id,
            siteUrl: site.url,
            authorizationHeader,
            myself,
          };
        }
        console.log(jiraCredentials);

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

  if (jiraCredentials && jiraCredentials.sites.length > 1 && !userSelectedSite) {
    // if we have multiple sites, we need to show a list to select the site
    const { sites } = jiraCredentials;

    if (sites.length === 1) {
      // if we only have one site, we can just select it
      jiraCredentials = {
        ...jiraCredentials,
        cloudId: sites[0].id,
        siteUrl: sites[0].url,
      };
      userSelectedSite = true;
    }

    // map the sites to a list of items
    return (
      <List>
        {sites.map((site) => (
          <List.Item
            key={site.id}
            title={site.name}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={() => {
                    // @ts-expect-error we know that jiraCredentials is not null
                    jiraCredentials = {
                      ...jiraCredentials,
                      cloudId: site.id,
                      siteUrl: site.url,
                    };
                    userSelectedSite = true;
                    forceRerender(x + 1);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

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

// TODO: Make this accessible from the UI
// Allow a user to reselect a site
export function reSelectSite() {
  userSelectedSite = false;
}

export function getJiraCredentials() {
  if (!jiraCredentials) {
    throw new Error("getJiraCredentials must be used when authenticated");
  }

  return jiraCredentials;
}
