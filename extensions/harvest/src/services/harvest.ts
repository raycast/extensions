import {
  HarvestClientsResponse,
  HarvestCompanyResponse,
  HarvestProjectAssignmentsResponse,
  HarvestTimeEntriesResponse,
  HarvestTimeEntryCreatedResponse,
  HarvestTimeEntryResponse,
  HarvestTimeEntry,
  HarvestProjectAssignment,
  HarvestUserResponse,
} from "./responseTypes";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { NewTimeEntryDuration, NewTimeEntryStartEnd } from "./requestTypes";
import dayjs from "dayjs";
import { useCachedPromise } from "@raycast/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAxiosError(error: any): error is AxiosError {
  return Object.keys(error).includes("isAxiosError");
}

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

export function useCompany() {
  return useCachedPromise(async () => {
    const resp = await harvestAPI<HarvestCompanyResponse>({ url: "/company" });
    return resp.data;
  });
}

export function useActiveClients() {
  return useCachedPromise(async () => {
    const resp = await harvestAPI<HarvestClientsResponse>({ url: "/clients", params: { is_active: true } });
    return resp.data.clients;
  });
}

export function useMyProjects() {
  return useCachedPromise(
    async () => {
      let project_assignments: HarvestProjectAssignment[] = [];
      let page = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const resp = await harvestAPI<HarvestProjectAssignmentsResponse>({
          url: "/users/me/project_assignments",
          params: { page },
        });
        project_assignments = project_assignments.concat(resp.data.project_assignments);
        if (resp.data.total_pages >= resp.data.page) break;
        page += 1;
      }
      return project_assignments;
    },
    [],
    { initialData: [] }
  );
}

export async function getMyId() {
  const id = await LocalStorage.getItem("myId");
  if (id) return id;

  const resp = await harvestAPI<HarvestUserResponse>({ url: "/users/me" });

  await LocalStorage.setItem("myId", resp.data.id);
  return resp.data.id;
}

export async function getMyTimeEntries({ from = new Date(), to = new Date() }: { from: Date; to: Date }) {
  const id = await getMyId();
  let time_entries: HarvestTimeEntry[] = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await harvestAPI<HarvestTimeEntriesResponse>({
      url: "/time_entries",
      params: {
        user_id: id,
        from: dayjs(from).startOf("day").format(),
        to: dayjs(to).endOf("day").format(),
        page,
      },
    });
    time_entries = time_entries.concat(resp.data.time_entries);
    if (resp.data.total_pages >= resp.data.page) break;
    page += 1;
  }
  return time_entries;
}

export async function newTimeEntry(param: NewTimeEntryDuration | NewTimeEntryStartEnd, id?: string) {
  const url = id ? `/time_entries/${id}` : "/time_entries";
  console.log({ url });
  const resp = await harvestAPI<HarvestTimeEntryCreatedResponse>({ method: id ? "PATCH" : "POST", url, data: param });
  return resp.data;
}

export async function stopTimer(entry?: HarvestTimeEntry) {
  if (!entry) {
    const id = await getMyId();
    const resp = await harvestAPI<HarvestTimeEntriesResponse>({
      url: "/time_entries",
      params: { user_id: id, is_running: true },
    });
    if (resp.data.time_entries.length === 0) {
      return true;
    }
    entry = resp.data.time_entries[0];
  }
  await harvestAPI<HarvestTimeEntryResponse>({
    url: `/time_entries/${entry.id}/stop`,
    method: "PATCH",
  });
  return true;
}

export async function restartTimer(entry: HarvestTimeEntry) {
  await harvestAPI<HarvestTimeEntryResponse>({
    url: `/time_entries/${entry.id}/restart`,
    method: "PATCH",
  });
  return true;
}

export async function deleteTimeEntry(entry: HarvestTimeEntry) {
  await harvestAPI<HarvestTimeEntryResponse>({
    url: `/time_entries/${entry.id}`,
    method: "DELETE",
  });
  return true;
}
