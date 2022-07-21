import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { MiteEntry } from "../model/MiteEntry";
import { Preferences } from "../model/Preferences";
import { Project } from "../model/Project";
import { Service } from "../model/Service";
import { TimeEntry } from "../model/TimeEntry";
import { getEntryFrequencies } from "./utils";

const preferences = getPreferenceValues<Preferences>();
const apiServer = preferences.miteApiServer;
const APIKEY = preferences.miteApiKey;
const excludedTerms = preferences.excludedTerms
  .split(",")
  .map((element) => element.trim())
  .filter((element) => element !== "");

const instance = axios.create({ timeout: 10000, headers: { "X-MiteApiKey": APIKEY } });
instance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    return Promise.reject(error);
  }
);

const mapProjects = (data: string) =>
  JSON.parse(data)
    .map((item: { project: Project }) => item.project)
    .sort((a: Project, b: Project) => {
      return a.customer_name.localeCompare(b.customer_name) || a.name.localeCompare(b.name);
    });
const mapServices = (data: string) => JSON.parse(data).map((item: { service: Service }) => item.service);
const mapTimeEntries = (data: string) => JSON.parse(data).map((item: { time_entry: TimeEntry }) => item.time_entry);
const mapTimeEntriesByPopularity = (data: string, n = 0) => {
  let miteEntries = mapTimeEntries(data);

  if (excludedTerms.length > 0) {
    miteEntries = miteEntries.filter((timeEntry: TimeEntry) => {
      return !excludedTerms.some((term) => timeEntry.note.toLowerCase().includes(term.toLowerCase()));
    });
  }

  miteEntries.map((timeEntry: TimeEntry) => {
    return {
      note: timeEntry.note,
      project_id: timeEntry.project_id,
      service_id: timeEntry.service_id,
    };
  });

  const entryFrequencies = getEntryFrequencies(miteEntries);
  if (n === 0) {
    return entryFrequencies;
  }
  return entryFrequencies.slice(0, n);
};

export const getProjects = () => {
  return instance.get(`${apiServer}/projects.json`, { transformResponse: mapProjects });
};

export const getServices = () => {
  return instance.get(`${apiServer}/services.json`, { transformResponse: mapServices });
};

export const getTimeEntries = (at = "") => {
  return instance.get(`${apiServer}/time_entries.json` + (at !== "" ? "?at=" + at : ""), {
    transformResponse: mapTimeEntries,
  });
};

export const getMostPopularTimeEntries = (n = 0) => {
  return instance.get(`${apiServer}/time_entries.json`, {
    transformResponse: (data) => mapTimeEntriesByPopularity(data, n),
  });
};

export const createTimeEntry = (projectId: number, serviceId: number, note: string) => {
  const payload: MiteEntry = {
    project_id: projectId,
    service_id: serviceId,
    note: note,
  };
  return instance.post(`${apiServer}/time_entries.json`, { time_entry: payload });
};

export const startTracker = (timeEntryId: number) => {
  return instance.patch(`${apiServer}/tracker/${timeEntryId}.json`);
};

export const stopTracker = () => {
  return instance.get(`${apiServer}/tracker.json`).then((response) => {
    const trackerTimeEntry = response.data.tracker.tracking_time_entry;
    console.log(trackerTimeEntry);
    return instance.delete(`${apiServer}/tracker/${trackerTimeEntry.id}.json`);
  });
};
