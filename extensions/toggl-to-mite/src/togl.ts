import moment, { Moment } from "moment";
import btoa from "btoa";
import fetch, { RequestInit } from "node-fetch";
import { randomInt } from "crypto";

type TogglParams = {
  date: Moment;
  workspaceId: string;
  token: string;
};

export const getDate = (date: string) => {
  const current = moment();

  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return moment(date);
  }
  if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
    return moment(date, "DD-MM-YYYY");
  }
  if (date.match(/^\d{2}-\d{2}$/)) {
    return moment(date, "DD-MM");
  }
  if (date.match(/^\d{2}$/)) {
    const day = parseInt(date, 10);

    if (day > current.date()) {
      return current.subtract(1, "month").date(day);
    }

    return current.date(day);
  }

  return moment();
};

export type TTogleEntrySimplified = {
  duration: number;
  description: string;
  client: string;
  project: string;
  tags: string;
  start: number;
  end: number;
  id: number;
  date: string;
  color: string;
};

export type TTogglEntry = {
  dur: number;
  description: string;
  client: string;
  project: string;
  tags: string[];
  start: string;
  end: string;
  id: number;
  project_hex_color: string;
};

export const getEntries = async ({ date, workspaceId, token }: TogglParams): Promise<TTogleEntrySimplified[]> => {
  const dateFrom = date.format("YYYY-MM-DD");
  const dateTo = date.format("YYYY-MM-DD");
  const userName = "api_token";
  const authToken = btoa(`${token}:${userName}`);

  const requestOptions: RequestInit = {
    method: "GET",
    headers: {
      Authorization: `Basic ${authToken}`,
    },
    redirect: "follow",
  };

  const url = `https://api.track.toggl.com/reports/api/v2/details?since=${dateFrom}&until=${dateTo}&workspace_id=${workspaceId}&user_agent=api_test`;
  const output = await fetch(url, requestOptions);
  const response = (await output.json()) as { data: TTogglEntry[] };
  return response.data.map((item: TTogglEntry) => ({
    duration: item.dur,
    description: item.description,
    client: item.client,
    project: item.project,
    tags: item.tags.join(","),
    start: +moment(item.start).format("X"),
    end: +moment(item.end).format("X"),
    id: item.id,
    date: moment(item.start).format("YYYY/MM/DD"),
    color: item.project_hex_color,
  }));
};

export type TMiteEntry = {
  duration: number;
  description: string;
  client: string;
  project: string;
  tags: string;
  start: number;
  end: number;
  id: number;
  date: string;
  color: string;
  durationTime: string;
};

export const getMiteEntries = (togglEntries: TTogleEntrySimplified[]): TMiteEntry[] => {
  const miteEntries: TMiteEntry[] = [];
  togglEntries.forEach((item) => {
    const existing = miteEntries.find(
      (entry) => entry.description == item.description && entry.project == item.project
    );
    if (existing) {
      existing.duration += item.duration;
      const time = Math.round(existing.duration / 60000);
      existing.durationTime = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}`;
    } else {
      const time = Math.round(item.duration / 60000);
      const durationTime = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}`;
      miteEntries.push({ ...item, durationTime });
    }
  });

  return miteEntries;
};

export type TPersonioEntry = {
  type: "work" | "break";
  start: string;
  end: string;
  id: number;
  date: string;
  duration: number;
};

export type TTotal = {
  worktime: string;
  breaktime: string;
};

export const getTotal = (togglEntries: TPersonioEntry[]): TTotal => {
  const workTime = togglEntries
    .filter((item) => item.type === "work")
    .reduce((total, item) => total + (item.duration || 0), 0);
  const breakTime = togglEntries
    .filter((item) => item.type === "break")
    .reduce((total, item) => total + (item.duration || 0), 0);

  const workTimeStr = `${Math.floor(workTime / 60)}:${(workTime % 60).toString().padStart(2, "0")}`;
  const breakTimeStr = `${Math.floor(breakTime / 60)}:${(breakTime % 60).toString().padStart(2, "0")}`;

  return { worktime: workTimeStr, breaktime: breakTimeStr };
};

export const getPersonioEnties = (togglEntries: TTogleEntrySimplified[]): TPersonioEntry[] => {
  const step = 1 * 60;
  const endWork = Math.max(...togglEntries.map((item) => item.end), 0);
  const toTime = endWork + step + step;
  const startWork = Math.min(...togglEntries.map((item) => item.start), toTime);
  const fromTime = startWork - step - step;

  togglEntries.sort((a, b) => a.start - b.start);

  const personioEntries: Record<number, TMiteEntry | boolean> = {};
  for (let i = fromTime; i <= toTime; i = i + step) {
    personioEntries[i] = togglEntries.some((item) => i > item.start && i < item.end);
  }

  const timeEntries: TPersonioEntry[] = [];
  let searchStart = true;

  Object.entries(personioEntries).forEach(([key, value]) => {
    if (searchStart) {
      if (value === true) {
        timeEntries.push({ start: moment.unix(+key).format("HH:mm") } as TPersonioEntry);
        searchStart = false;
      }
    } else {
      if (!value) {
        timeEntries[timeEntries.length - 1].end = moment.unix(+key).format("HH:mm");
        searchStart = true;
      }
    }
  });

  const arr: TPersonioEntry[] = [];
  timeEntries.forEach((item, index) => {
    arr.push({
      type: "work",
      start: item.start,
      end: item.end,
      duration: moment(item.end, "HH:mm").diff(moment(item.start, "HH:mm"), "minutes"),
      id: randomInt(1000000, 9999999),
      date: moment().format("YYYY-MM"),
    });
    if (timeEntries[index + 1]) {
      arr.push({
        type: "break",
        start: item.end,
        duration: moment(timeEntries[index + 1].start, "HH:mm").diff(moment(item.end, "HH:mm"), "minutes"),
        end: timeEntries[index + 1].start,
        id: randomInt(1000000, 9999999),
        date: moment().format("YYYY-MM"),
      });
    }
  });
  return arr;
};
