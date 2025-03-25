import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, concat, NormalizedCacheObject } from "@apollo/client";
import fetch from "cross-fetch";

import { getPreferenceValues } from "@raycast/api";
import { getHttpAgent, GitLab } from "./gitlabapi";

export function createGitLabClient(): GitLab {
  const preferences = getPreferenceValues();
  const instance = (preferences.instance as string) || "https://gitlab.com";
  const token = preferences.token as string;
  const gitlab = new GitLab(instance, token);
  return gitlab;
}

export class GitLabGQL {
  public url: string;
  public client: ApolloClient<NormalizedCacheObject>;
  constructor(url: string, client: ApolloClient<NormalizedCacheObject>) {
    this.url = url;
    this.client = client;
  }
  public urlJoin(url: string): string {
    return `${this.url}/${url}`;
  }
}

export function createGitLabGQLClient(): GitLabGQL {
  const preferences = getPreferenceValues();
  const instance = (preferences.instance as string) || "https://gitlab.com";
  const token = preferences.token as string;
  const graphqlEndpoint = `${instance}/api/graphql`;
  const httpLink = new HttpLink({ uri: graphqlEndpoint, fetch, fetchOptions: { agent: getHttpAgent() } });

  const authMiddleware = new ApolloLink((operation, forward) => {
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    }));
    return forward(operation);
  });

  const client = new ApolloClient({
    link: concat(authMiddleware, httpLink),
    cache: new InMemoryCache(),
  });
  return new GitLabGQL(instance, client);
}

export const gitlab = createGitLabClient();

const defaultRefreshInterval = 10 * 1000;

let gitlabgql: GitLabGQL | undefined;

export function getGitLabGQL(): GitLabGQL {
  if (!gitlabgql) {
    gitlabgql = createGitLabGQLClient();
  }
  return gitlabgql;
}

export function getCIRefreshInterval(): number | null {
  const preferences = getPreferenceValues();
  const userValue = preferences.cirefreshinterval as string;
  if (!userValue || userValue.length <= 0) {
    return defaultRefreshInterval;
  }
  const sec = parseFloat(userValue);
  if (Number.isNaN(sec)) {
    console.log(`invalid value ${userValue}, fallback to null`);
    return null;
  }
  if (sec < 1) {
    return null;
  } else {
    return sec * 1000; // ms
  }
}

export enum PrimaryAction {
  Detail = "detail",
  Browser = "browser",
}

export function getPrimaryActionPreference(): PrimaryAction {
  const pref = getPreferenceValues();
  const val = (pref.primaryaction as string) || undefined;
  if (val !== PrimaryAction.Detail && val !== PrimaryAction.Browser) {
    return PrimaryAction.Browser;
  }
  const result: PrimaryAction = val;
  return result;
}

export function getPreferPopToRootPreference(): boolean {
  const pref = getPreferenceValues();
  const val = (pref.poptoroot as boolean) || false;
  if (val === true) {
    return true;
  }
  return false;
}

export function getListDetailsPreference(): boolean {
  const pref = getPreferenceValues();
  const val = (pref.listdetails as boolean) || false;
  if (val === true) {
    return true;
  }
  return false;
}

export function getExcludeTodoAuthorUsernamesPreference(): string[] {
  const pref = getPreferenceValues();
  return pref.excludeTodoAuthorUsernames?.split(",").map((u: string) => u.trim()) || [];
}
