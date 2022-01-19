import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, concat, NormalizedCacheObject } from "@apollo/client";
import fetch from "node-fetch";

import { preferences } from "@raycast/api";
import { GitLab } from "./gitlabapi";

export function createGitLabClient() {
  const instance = (preferences.instance?.value as string) || "https://gitlab.com";
  const token = preferences.token?.value as string;
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

export function createGitLabGQLClient() {
  const instance = (preferences.instance?.value as string) || "https://gitlab.com";
  const token = preferences.token?.value as string;
  const graphqlEndpoint = `${instance}/api/graphql`;
  const httpLink = new HttpLink({ uri: graphqlEndpoint, fetch });

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
export const gitlabgql = createGitLabGQLClient();
