import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import {
  CurrentEntry,
  Timer,
  Preferences,
  Project,
  Workspace,
  NewTimeEntry,
  isProject,
  isWorkspace,
  isTimer,
  isCurrentEntry,
} from "./types";

async function togglGet(baseURL: string) {
  const prefs: Preferences = getPreferenceValues();
  const auth = "Basic " + Buffer.from(prefs.apiToken + ":api_token").toString("base64");
  const response = await fetch(baseURL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
  });
  const resJSON = await response.json();
  return resJSON;
}

async function togglPost(
  baseURL: string,
  data: {
    time_entry: {
      description: string;
      pid: number;
      created_with: string;
    };
  }
) {
  const prefs: Preferences = getPreferenceValues();
  const auth = "Basic " + Buffer.from(prefs.apiToken + ":api_token").toString("base64");
  await fetch(baseURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body: JSON.stringify(data),
  });
}

async function togglPut(baseURL: string) {
  const prefs: Preferences = getPreferenceValues();
  const auth = "Basic " + Buffer.from(prefs.apiToken + ":api_token").toString("base64");
  await fetch(baseURL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
  });
}

async function getProjects(workspaceID: string): Promise<Array<Project>> {
  const baseURL = `https://api.track.toggl.com/api/v8/workspaces/${workspaceID}/projects`;
  const projects = await togglGet(baseURL);
  if (isProject(projects)) {
    return projects;
  } else {
    throw "Projects array not valid!";
  }
}

async function getWorkspaces(): Promise<Array<Workspace>> {
  const baseURL = "https://api.track.toggl.com/api/v8/workspaces";
  const response = await togglGet(baseURL);
  if (isWorkspace(response)) {
    return response;
  } else {
    throw "Workspace array not valid!";
  }
}

async function startTimer(timerObject: NewTimeEntry) {
  const baseURL = "https://api.track.toggl.com/api/v8/time_entries/start";
  const data = {
    time_entry: {
      description: timerObject.description,
      pid: timerObject.pid,
      created_with: "toggl-unofficial",
    },
  };
  await togglPost(baseURL, data);
}

async function getTimers(): Promise<Array<Timer>> {
  const baseURL = "https://api.track.toggl.com/api/v8/time_entries?start_date=";

  const date = new Date();
  const now = date.toISOString();
  date.setDate(date.getDate() - 30);
  const thirtyDaysAgo = date.toISOString();

  const urlWithParams = baseURL + encodeURIComponent(thirtyDaysAgo) + "&end_date=" + encodeURIComponent(now);

  const response = await togglGet(urlWithParams);
  if (isTimer(response)) {
    return response;
  } else {
    throw "Entries not valid!";
  }
}

async function getCurrentTimer(): Promise<CurrentEntry> {
  const baseURL = "https://api.track.toggl.com/api/v8/time_entries/current";
  const response = await togglGet(baseURL);
  if (isCurrentEntry(response)) {
    return response;
  } else {
    throw "Currently running entry not valid";
  }
}

async function stopTimer(id: number) {
  const baseURL = `https://api.track.toggl.com/api/v8/time_entries/${id}/stop`;
  await togglPut(baseURL);
}

export { getProjects, getWorkspaces, startTimer, getTimers, getCurrentTimer, stopTimer };
