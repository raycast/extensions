import fetch, { Response } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Application, Build, BuildStatus } from "./types";

export const sortApps = (apps: Application[]): Application[] => {
  const sorted = apps.sort((a, b) => a.appName.localeCompare(b.appName));
  return sorted;
};

export const filterApps = (apps: Application[], query: string): Application[] => {
  const queryLowercased = query.toLowerCase();
  const filtered = apps.filter((a) => a.appName.toLowerCase().includes(queryLowercased));
  return filtered;
};

export const sortBuilds = (builds: Build[]): Build[] => {
  const sorted = builds.sort((a, b) => {
    const aDate = a.startedAt ? new Date(Date.parse(a.startedAt)) : new Date(0);
    const bDate = b.startedAt ? new Date(Date.parse(b.startedAt)) : new Date(0);
    return bDate.getTime() - aDate.getTime();
  });
  return sorted;
};

export const filterBuilds = (builds: Build[], query: string, buildStatus?: BuildStatus): Build[] => {
  const queryLowercased = query.toLowerCase();
  const filtered = builds
    .filter((build) => queryLowercased.length == 0 || build.branch.toLowerCase().includes(queryLowercased))
    .filter((build) => build.status == (buildStatus ?? build.status));

  return filtered;
};

export async function request(
  path: string,
  body: unknown | null = null,
  headers: { [key: string]: string } | null = null,
  method = "GET"
): Promise<Response> {
  const { token } = getPreferenceValues();
  const res = await fetch("https://api.codemagic.io" + path, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate, br",
      "x-auth-token": token,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    method,
  });
  return res;
}
