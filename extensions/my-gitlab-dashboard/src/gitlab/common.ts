import { getPreferenceValues } from "@raycast/api";
import { Response as NodeFetchResponse } from "node-fetch";

interface Preferences {
  gitlabInstance: string;
  gitlabToken: string;
  jiraInstance?: string;
}
const preferences = getPreferenceValues<Preferences>();

export const headers = {
  Authorization: `bearer ${preferences.gitlabToken}`,
  "Content-Type": "application/json",
};

export interface Jira {
  key: string;
  url: string;
}

export const graphQlEndpoint = `${preferences.gitlabInstance}/api/graphql`;

export function pathToUrl(path: string): string {
  return `${preferences.gitlabInstance}${path}`;
}

export function checkStatusCode(res: Response | NodeFetchResponse): Response | NodeFetchResponse {
  if (res.ok) {
    return res;
  }

  if (res.status === 401 || res.status === 403) {
    throw new AuthorizationError(`${res.status} ${res.statusText}`);
  }
  throw new UnknownServerError(`${res.status} ${res.statusText}`);
}

export class AuthorizationError extends Error {}
export class UnknownServerError extends Error {}

export function tryExtractJira(s: string): Jira | undefined {
  if ((preferences.jiraInstance ?? "") === "") {
    return;
  }

  const jiraKey = s.match(/\[(?<key>[A-Z]+-(\d+))\]/)?.groups?.key;
  if (jiraKey !== undefined) {
    return {
      key: jiraKey,
      url: `${preferences.jiraInstance}/browse/${jiraKey}`,
    };
  }
}
