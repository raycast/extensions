import { getPreferenceValues } from "@raycast/api";
import { createJiraUrl } from "./utils";
import { handleJiraResponseError } from "./handlers";
import fetch from "node-fetch";
export const jiraRequest = async (
  endpoint: string,
  requestBody?: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
) => {
  const prefs = getPreferenceValues<Preferences>();
  const res = await fetch(createJiraUrl(endpoint), {
    method,
    body: requestBody,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization:
        prefs.isJiraCloud === "cloud"
          ? `Basic ${Buffer.from(`${prefs.username}:${prefs.token}`).toString("base64")}`
          : `Bearer ${prefs.token}`,
    },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    if (res.ok) throw new Error("Jira returned an invalid JSON response.");
  }
  if (!res.ok) handleJiraResponseError(res.status, body);
  return body;
};
