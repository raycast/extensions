import { getPreferenceValues } from "@raycast/api";
import { v1 } from "@datadog/datadog-api-client";


const API_KEY = getPreferenceValues()["api-key"];
const APP_KEY = getPreferenceValues()["app-key"];

const configuration = v1.createConfiguration({ authMethods: { apiKeyAuth: API_KEY, appKeyAuth: APP_KEY } });

export const dashboardsApi = new v1.DashboardsApi(configuration);
export const monitorsApi = new v1.MonitorsApi(configuration);

