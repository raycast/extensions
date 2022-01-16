import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Timer {
  name: string;
  project: number;
}

interface TimerBody {
  time_entry: {
    description: string;
    pid: number;
    created_with: string;
  };
}

interface Preferences {
  apiToken: string;
}

interface Project {
  id: number;
  wid: number;
  name: string;
  billable: boolean;
  is_private: boolean;
  active: boolean;
  template: boolean;
  at: string;
  created_at: string;
  color: string;
  auto_estimates: boolean;
  actual_hours: number;
  hex_color: string;
}

interface Workspace {
  id: number;
  name: string;
  profile: number;
  premium: boolean;
  admin: boolean;
  default_hourly_rate: number;
  default_currency: string;
  only_admins_may_create_projects: boolean;
  only_admins_see_billable_rates: boolean;
  only_admins_see_team_dashboard: boolean;
  projects_billable_by_default: boolean;
  rounding: number;
  rounding_minutes: number;
  api_token: string;
  at: string;
  ical_enabled: boolean;
}

interface EntryFromAPI {
  id: number;
  wid: number;
  pid: number;
  billable: boolean;
  start: string;
  stop: string;
  duration: number;
  description: string;
  tags: Array<string>;
  at: string;
}

interface CurrentEntry {
  data: {
    id: number;
    wid: number;
    pid: number;
    billable: boolean;
    start: string;
    duration: number;
    description: string;
    duronly: boolean;
    at: string;
    uid: number;
  };
}

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

async function togglPost(baseURL: string, data: TimerBody) {
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

function isProject(arg: unknown): arg is Array<Project> {
  console.log(arg);
  return true;
}

function isWorkspace(arg: unknown): arg is Array<Workspace> {
  console.log(arg);
  return true;
}

function isEntries(arg: unknown): arg is Array<EntryFromAPI> {
  console.log(arg);
  return true;
}

function isCurrentEntry(arg: unknown): arg is CurrentEntry {
  console.log(arg);
  return true;
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

async function getWorkspaceID(): Promise<string> {
  const baseURL = "https://api.track.toggl.com/api/v8/workspaces";
  const response = await togglGet(baseURL);
  if (isWorkspace(response)) {
    return response[0].id.toString();
  } else {
    throw "Workspace array not valid!";
  }
}

async function startTimer(timerObject: Timer) {
  const baseURL = "https://api.track.toggl.com/api/v8/time_entries/start";
  const data: TimerBody = {
    time_entry: {
      description: timerObject.name,
      pid: timerObject.project,
      created_with: "toggl-unofficial",
    },
  };
  await togglPost(baseURL, data);
}

async function getTimers(): Promise<Array<EntryFromAPI>> {
  const baseURL = "https://api.track.toggl.com/api/v8/time_entries?start_date=";

  const date = new Date();
  const now = date.toISOString();
  date.setDate(date.getDate() - 30);
  const thirtyDaysAgo = date.toISOString();

  const urlWithParams = baseURL + encodeURIComponent(thirtyDaysAgo) + "&end_date=" + encodeURIComponent(now);

  const response = await togglGet(urlWithParams);
  if (isEntries(response)) {
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

export { getProjects, getWorkspaceID, startTimer, getTimers, getCurrentTimer, stopTimer };
