import { getPreferenceValues } from "@raycast/api";
import { createJiraUrl } from "./utils";
import { handleJiraResponseError } from "./handlers";
import fetch from "node-fetch";

const prefs = getPreferenceValues();

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Basic ${Buffer.from(`${prefs.username}:${prefs.token}`).toString("base64")}`,
};

export const jiraRequest = async (endpoint: string, requestBody?: string, method: "GET" | "POST" = "GET") => {
  const opts = {
    headers,
    method,
    body: requestBody,
  };
  const res = await fetch(createJiraUrl(endpoint), opts);
  const responseBody = await res.json();
  if (!res.ok) handleJiraResponseError(res.status, responseBody);
  return responseBody;
};
