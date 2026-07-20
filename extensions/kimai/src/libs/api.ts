import dayjs from "dayjs";
import { convertToHours } from "./helpers";
import getPreferences from "./preferences";
import nodeFetch, { RequestInit } from "node-fetch";
import { z } from "zod";

interface TimesheetPayload {
  begin: string; // Date
  end: string | null; // Date
  project: number;
  activity: number;
  description: string;
}

const timesheetSchema = z.object({
  activity: z.number(),
  project: z.number(),
  user: z.number(),
  id: z.number(),
  begin: z.string(),
  end: z.string().nullable(),
  duration: z.number(),
  description: z.string().nullable(),
  rate: z.number(),
  internalRate: z.number(),
  exported: z.boolean(),
  billable: z.boolean(),
});

const projectSchema = z.object({
  parentTitle: z.string(),
  customer: z.number(),
  id: z.number(),
  name: z.string(),
  visible: z.boolean(),
  billable: z.boolean(),
  globalActivities: z.boolean(),
});

const activitySchema = z.object({
  parentTitle: z.string().nullish(),
  project: z.number().nullish(),
  id: z.number(),
  name: z.string(),
  visible: z.boolean(),
  billable: z.boolean(),
});

const fetch = async (apiPath: string, init?: RequestInit | undefined) => {
  const { domain, email, password, protocol: _protocol, token } = getPreferences();
  const protocol = _protocol || "https";

  const response = await nodeFetch(`${protocol}://${domain}/api/${apiPath}`, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!token && email ? { "X-AUTH-USER": email } : {}),
      ...(!token && password ? { "X-AUTH-TOKEN": password } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await response.json();
  return data;
};

export const validateProjects = (data: unknown) => {
  const validationResponse = z.array(projectSchema).safeParse(data);
  return validationResponse.success ? validationResponse.data : [];
};

export const validateActivities = (data: unknown) => {
  const validationResponse = z.array(activitySchema).safeParse(data);
  return validationResponse.success ? validationResponse.data : [];
};

export const validateTimesheets = (data: unknown) => {
  const validationResponse = z.array(timesheetSchema).safeParse(data);
  return validationResponse.success ? validationResponse.data : [];
};

const calculateTotalSeconds = (timesheets: z.infer<typeof timesheetSchema>[]) => {
  return timesheets.reduce((r, t) => {
    if (t.end === null) {
      return r + dayjs().diff(dayjs(t.begin), "second");
    }
    return r + t.duration;
  }, 0);
};

export const getLoggedHoursToday = async () => {
  const startDate = `${dayjs().format("YYYY-MM-DD")}T00:00:00`;
  const responseData = await fetch(`timesheets?begin=${startDate}`);
  const totalSeconds = calculateTotalSeconds(validateTimesheets(responseData));
  return convertToHours(totalSeconds);
};

export const getLoggedHoursThisWeek = async () => {
  const startDate = `${dayjs().startOf("week").format("YYYY-MM-DD")}T00:00:00`;
  const responseData = await fetch(`timesheets?begin=${startDate}`);
  const totalSeconds = calculateTotalSeconds(validateTimesheets(responseData));
  return convertToHours(totalSeconds);
};

export const getLoggedHoursThisMonth = async () => {
  const startDate = `${dayjs().startOf("month").format("YYYY-MM-DD")}T00:00:00`;
  const responseData = await fetch(`timesheets?begin=${startDate}`);
  const totalSeconds = calculateTotalSeconds(validateTimesheets(responseData));
  return convertToHours(totalSeconds);
};

export const getProjects = async () => {
  const responseData = await fetch(`projects?visible=1`);
  return validateProjects(responseData);
};

export const getActivities = async () => {
  const responseData = await fetch(`activities?visible=1`);
  return validateActivities(responseData);
};

export const saveTimesheet = async (body: TimesheetPayload) => {
  await fetch("timesheets", {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const getActiveTimesheet = async () => {
  const responseData = await fetch(`timesheets?active=1`);
  const timesheets = validateTimesheets(responseData);
  return timesheets.length > 0 ? timesheets[0] : null;
};

export const stopTimesheet = async (id: number) => {
  await fetch(`timesheets/${id}/stop`, {
    method: "PATCH",
  });
};

export const getRecentTimesheets = async (days: number = 7) => {
  const startDate = `${dayjs().subtract(days, "day").format("YYYY-MM-DD")}T00:00:00`;
  const responseData = await fetch(`timesheets?begin=${startDate}&order=DESC&orderBy=begin`);
  return validateTimesheets(responseData);
};

export const updateTimesheet = async (id: number, body: Partial<TimesheetPayload>) => {
  await fetch(`timesheets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
};

export const deleteTimesheet = async (id: number) => {
  await fetch(`timesheets/${id}`, {
    method: "DELETE",
  });
};

export type Timesheet = z.infer<typeof timesheetSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Activity = z.infer<typeof activitySchema>;
