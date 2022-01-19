import { getPreferenceValues } from "@raycast/api";
import { v1 } from "@datadog/datadog-api-client";
import fetch from "node-fetch";
import { APM } from "./types";

const API_KEY = getPreferenceValues()["api-key"];
const APP_KEY = getPreferenceValues()["app-key"];

const configuration = v1.createConfiguration({ authMethods: { apiKeyAuth: API_KEY, appKeyAuth: APP_KEY } });

export const dashboardsApi = new v1.DashboardsApi(configuration);

export const apiAPM = ({ env }: { env: string }): Promise<APM[]> =>
  fetch(`https://api.datadoghq.com/api/v1/service_dependencies?env=${env}`, params)
    .then(resp => resp.json())
    .then(json => json as Record<string, { calls: string[] }>)
    .then(rec => Object.entries(rec).sort(([l], [r]) => (l < r ? -1 : 1)))
    .then(entries => entries.map(([name, { calls }]) => ({ env, name, calls } as APM)));

const params = {
  headers: {
    "Content-Type": "application/json",
    "DD-API-KEY": API_KEY,
    "DD-APPLICATION-KEY": APP_KEY,
  },
};
