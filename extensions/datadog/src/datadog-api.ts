import { getPreferenceValues } from "@raycast/api";
import { v1 } from "@datadog/datadog-api-client";
import fetch, { Response } from "node-fetch";
import { APM } from "./types";

const { "api-key": API_KEY, "app-key": APP_KEY, server: SERVER } = getPreferenceValues();

const configuration = v1.createConfiguration({ authMethods: { apiKeyAuth: API_KEY, appKeyAuth: APP_KEY } });
v1.setServerVariables(configuration, {
  site: SERVER,
});

export const dashboardsApi = new v1.DashboardsApi(configuration);

export const apiAPM = ({ env }: { env: string }): Promise<APM[]> =>
  fetch(`https://api.${SERVER}/api/v1/service_dependencies?env=${env}`, params)
    .then(parseResponseToJSON)
    .then(json => json as Record<string, { calls: string[] }>)
    .then(rec => Object.entries(rec).sort(([l], [r]) => (l < r ? -1 : 1)))
    .then(entries => entries.map(([name, { calls }]) => ({ env, name, calls } as APM)));

const parseResponseToJSON = (resp: Response) =>
  resp.json().then(json => {
    if (resp.ok) return json;

    const err = json as { errors: string[] };

    throw new Error(err.errors.join(", "));
  });

const params = {
  headers: {
    "Content-Type": "application/json",
    "DD-API-KEY": API_KEY,
    "DD-APPLICATION-KEY": APP_KEY,
  },
};
