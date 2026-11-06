import { baseUrl } from "../constants";
import { MonitorsState } from "../interface";
import { getResponseErrorMessage } from "../utils";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

// Credentials and request details that shouldn't be sent to the AI
const sensitiveAttributes = [
  "auth_username",
  "auth_password",
  "request_headers",
  "request_body",
  "environment_variables",
  "playwright_script",
  "proxy_host",
];

export default async function () {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${baseUrl}/monitors`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  const monitors = (await response.json()) as MonitorsState;

  return {
    ...monitors,
    data: monitors.data.map((monitor) => ({
      ...monitor,
      attributes: Object.fromEntries(
        Object.entries(monitor.attributes).filter(([key]) => !sensitiveAttributes.includes(key)),
      ),
    })),
  };
}
