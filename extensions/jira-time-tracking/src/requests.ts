import { getPreferenceValues } from "@raycast/api";
import { createJiraUrl } from "./utils";
import { handleJiraResponseError } from "./handlers";
import fetch from "node-fetch";

interface UserPreferences {
  isJiraCloud: string; // "cloud" or "server"
  username: string;
  token: string;
}

const prefs = getPreferenceValues<UserPreferences>();

const getHeaders = () => {
  if (prefs.isJiraCloud === "cloud") {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${prefs.username}:${prefs.token}`).toString("base64")}`,
    };
  } else {
    // For Jira Server
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${prefs.token}`,
    };
  }
};

export const jiraRequest = async (endpoint: string, requestBody?: string, method: "GET" | "POST" = "GET") => {
  const headers = getHeaders();
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
