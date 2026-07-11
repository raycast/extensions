import { ApolloClient, ApolloLink, fromPromise, HttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import fetch from "node-fetch";

import os from "os";
import path from "path";
import { getHttpAgent, GitLab } from "./gitlabapi";
import { authorize, refreshToken } from "./oauth";
import {
  getInstance,
  getPreferences,
  isOAuthEnabled,
  parseCommaSeparatedPreference,
  requirePersonalAccessToken,
} from "./utils";

let gitlabClient: GitLab | undefined;

export async function resolveToken(): Promise<string> {
  if (isOAuthEnabled()) return authorize();
  return requirePersonalAccessToken();
}

function createGitLabClient(): GitLab {
  return new GitLab(
    getInstance(),
    isOAuthEnabled()
      ? { authType: "oauth", resolve: resolveToken, refresh: refreshToken }
      : { authType: "pat", resolve: resolveToken },
  );
}

function getGitLabClient(): GitLab {
  if (!gitlabClient) {
    gitlabClient = createGitLabClient();
  }
  return gitlabClient;
}

class GitLabGQL {
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

function createGitLabGQLClient(): GitLabGQL {
  const instance = getInstance();
  const httpLink = new HttpLink({
    uri: `${instance}/api/graphql`,
    fetch: fetch as unknown as typeof globalThis.fetch,
    fetchOptions: { agent: getHttpAgent() },
  });

  const authLink = setContext(async (_, prevContext) => {
    const token = await resolveToken();
    return {
      headers: {
        ...(prevContext.headers ?? {}),
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      for (const error of graphQLErrors) {
        console.warn(`GitLab GraphQL: ${error.message}`);
      }
    }
    if (networkError) {
      const statusCode = "statusCode" in networkError ? networkError.statusCode : undefined;
      console.warn(`GitLab GraphQL network error${statusCode ? ` ${statusCode}` : ""}: ${networkError.message}`);
      if (statusCode === 401 && isOAuthEnabled() && !operation.getContext().gitlabAuthRetried && forward) {
        operation.setContext({ gitlabAuthRetried: true });
        return fromPromise(refreshToken()).flatMap(() => forward(operation));
      }
    }
  });

  const client = new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        // Raycast hooks own caching; Apollo normalized cache merge fails when list
        // filter variables change (e.g. project.mergeRequests with different state).
        fetchPolicy: "no-cache",
      },
    },
  });
  return new GitLabGQL(instance, client);
}

export const gitlab: GitLab = new Proxy({} as GitLab, {
  get(_target, prop) {
    const client = getGitLabClient();
    const value = Reflect.get(client, prop, client) as unknown;
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

let gitlabgql: GitLabGQL | undefined;

export function getGitLabGQL(): GitLabGQL {
  if (!gitlabgql) {
    gitlabgql = createGitLabGQLClient();
  }
  return gitlabgql;
}

export enum PrimaryAction {
  Detail = "detail",
  Browser = "browser",
}

export function getPrimaryActionPreference(): PrimaryAction {
  const { primaryaction } = getPreferences();
  if (primaryaction === PrimaryAction.Detail) {
    return PrimaryAction.Detail;
  }
  return PrimaryAction.Browser;
}

export function getPreferPopToRootPreference(): boolean {
  return getPreferences().poptoroot;
}

export function getExcludeTodoAuthorUsernamesPreference(): string[] {
  return parseCommaSeparatedPreference(getPreferences().excludeTodoAuthorUsernames);
}

export function getArtifactDownloadDirectoryPreference(): string {
  const directory = (getPreferences().artifactDownloadDirectory ?? "").trim();
  if (!directory) {
    return path.join(os.homedir(), "Downloads");
  }
  if (directory.startsWith("~/")) {
    return path.join(os.homedir(), directory.slice(2));
  }
  return directory;
}
