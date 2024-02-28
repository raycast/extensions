import dayjs from "dayjs";
import { convertToHours } from "./helpers";
import getPreferences from "./preferences";
import nodeFetch, { RequestInit } from "node-fetch";

interface Timesheet {
  activity: number;
  project: number;
  user: number;
  id: number;
  begin: string; // Date
  end: string; // Date
  duration: number; // in seconds
  description: string;
  rate: number; // total sum
  internalRate: number;
  exported: boolean;
  billable: boolean;
}

export interface Project {
  parentTitle: string;
  customer: number;
  id: number;
  name: string;
  visible: boolean;
  billable: boolean;
  globalActivities: boolean;
}

export interface Activity {
  parentTitle: string | null;
  project: number | null;
  id: number;
  name: string;
  visible: boolean;
  billable: boolean;
}

interface TimesheetPayload {
  begin: string; // Date
  end: string; // Date
  project: number;
  activity: number;
  description: string;
}

const fetch = async (apiPath: string, init?: RequestInit | undefined) => {
  const { domain, email, password, protocol: _protocol } = getPreferences();
  const protocol = _protocol || "https";

  const response = await nodeFetch(`${protocol}://${domain}/api/${apiPath}`, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      "X-AUTH-USER": email,
      "X-AUTH-TOKEN": password,
      ...(init?.headers || {}),
    },
  });
  const data = await response.json();
  return data;
};

export const getLoggedHoursToday = async () => {
  const startDate = `${dayjs().format("YYYY-MM-DD")}T00:00:00`;
  const timesheets = (await fetch(`timesheets?begin=${startDate}`)) as Timesheet[];
  const totalSeconds = timesheets?.reduce((r, t) => r + t.duration, 0);
  return convertToHours(totalSeconds);
};

export const getProjects = async () => {
  const projects = (await fetch(`projects?visible=1`)) as Project[];
  return projects;
};

export const getActivities = async () => {
  const activities = (await fetch(`activities?visible=1`)) as Activity[];
  return activities;
};

export const saveTimesheet = async (body: TimesheetPayload) => {
  await fetch("timesheets", {
    method: "POST",
    body: JSON.stringify(body),
  });
};
