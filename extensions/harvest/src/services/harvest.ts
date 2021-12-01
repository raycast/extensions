import {
  HarvestClientsResponse,
  HarvestCompanyResponse,
  HarvestProjectAssignmentsResponse,
  HarvestTimeEntriesResponse,
  HarvestTimeEntryCreatedResponse,
  HarvestTimeEntryResponse,
} from "./responseTypes";
import { getLocalStorageItem, getPreferenceValues, setLocalStorageItem } from "@raycast/api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { NewTimeEntryDuration, NewTimeEntryStartEnd } from "./requestTypes";

interface Preferences {
  token: string;
  accountID: string;
}

const { token, accountID }: Preferences = getPreferenceValues();
const api = axios.create({
  baseURL: "https://api.harvestapp.com/v2",
  headers: {
    Authorization: `Bearer ${token}`,
    "Harvest-Account-Id": accountID,
    "User-Agent": "Raycast Extension (https://github.com/eluce2)",
    "Content-Type": "application/json",
  },
});

async function harvestAPI<T = AxiosResponse>({ method = "GET", ...props }: AxiosRequestConfig) {
  const resp = await api.request<unknown, T>({ method, ...props });
  return resp;
}

export async function getCompany() {
  const key = "company";
  const cache = await getLocalStorageItem(key);
  if (cache !== undefined) return JSON.parse(cache.toString());

  const resp = await harvestAPI<HarvestCompanyResponse>({ url: "/company" });
  await setLocalStorageItem(key, JSON.stringify(resp.data));
  return resp.data;
}

export async function getClients() {
  const key = "clients";
  const cache = await getLocalStorageItem(key);
  if (cache !== undefined) return JSON.parse(cache.toString());

  const resp = await harvestAPI<HarvestClientsResponse>({ url: "/clients", params: { is_active: true } });
  await setLocalStorageItem(key, JSON.stringify(resp.data.clients));
  return resp.data.clients;
}

export async function getMyProjectAssignments() {
  const key = "project-assignments";
  const cache = await getLocalStorageItem(key);
  if (cache !== undefined) return JSON.parse(cache.toString());

  const resp = await harvestAPI<HarvestProjectAssignmentsResponse>({
    url: "/users/me/project_assignments",
  });
  await setLocalStorageItem(key, JSON.stringify(resp.data.project_assignments));
  return resp.data.project_assignments;
}

export async function newTimeEntry(param: NewTimeEntryDuration | NewTimeEntryStartEnd) {
  const resp = await harvestAPI<HarvestTimeEntryCreatedResponse>({ method: "POST", url: "/time_entries", data: param });
  return resp.data;
}

export async function stopTimer() {
  const resp = await harvestAPI<HarvestTimeEntriesResponse>({ url: "/time_entries", params: { is_running: true } });
  if (resp.data.time_entries.length === 0) {
    return true;
  }
  await harvestAPI<HarvestTimeEntryResponse>({
    url: `/time_entries/${resp.data.time_entries[0].id}/stop`,
    method: "PATCH",
  });
  return true;
}
