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
  HarvestCompany,
} from "./responseTypes";
import {
  Cache,
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { NewTimeEntryDuration, NewTimeEntryStartEnd } from "./requestTypes";
import dayjs from "dayjs";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";

const cache = new Cache();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAxiosError(error: any): error is AxiosError {
  return Object.keys(error).includes("isAxiosError");
}

interface Preferences {
  token: string;
  accountID: string;
  timeFormat: "hours_minutes" | "decimal" | "company";
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
  try {
    const resp = await api.request<unknown, T>({ method, ...props });
    return resp;
  } catch (error) {
    if (!isAxiosError(error)) throw error;
    if (error.response?.status === 429) {
      const data = error.response?.data as { retry_after: number; message: string };

      // try again after the retry_after time
      console.log(`Hit a rate-limit. Retrying after ${data.retry_after} seconds`, environment.launchType);

      const toast =
        environment.launchType === LaunchType.UserInitiated
          ? await showToast({
              style: Toast.Style.Animated,
              title: "Rate-limited by Harvest, please wait...",
            })
          : null;
      await new Promise((resolve) => setTimeout(resolve, data.retry_after * 1000));
      const result = (await harvestAPI<T>({ method, ...props })) as T;
      await toast?.hide();
      return result;
    }
    throw error;
  }
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

async function fetchProjects() {
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
}
export function useMyProjects() {
  return useCachedPromise(fetchProjects, [], { initialData: [], keepPreviousData: true });
}

export async function getMyId() {
  const id = await LocalStorage.getItem("myId");
  if (id) return id;

  const resp = await harvestAPI<HarvestUserResponse>({ url: "/users/me" });

  await LocalStorage.setItem("myId", resp.data.id);
  return resp.data.id;
}

export function useMyTimeEntries(from = new Date(), to = new Date()) {
  const qr = useCachedPromise(getMyTimeEntries, [{ from, to }], { initialData: [], keepPreviousData: true });
  useEffect(() => {
    if (from === new Date() && to === new Date()) {
      const running_timer = qr.data.find((o) => o.is_running);
      if (running_timer) {
        cache.set("running", JSON.stringify(running_timer));
      } else {
        cache.remove("running");
      }
    }
  }, [qr.data]);
  return qr;
}

export async function getMyTimeEntries(args?: { from: Date; to: Date }): Promise<HarvestTimeEntry[]> {
  const { from = new Date(), to = new Date() } = args ?? {};
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
  refreshMenuBar();
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
  refreshMenuBar();
  return true;
}

export async function restartTimer(entry: HarvestTimeEntry) {
  await harvestAPI<HarvestTimeEntryResponse>({
    url: `/time_entries/${entry.id}/restart`,
    method: "PATCH",
  });
  refreshMenuBar();
  return true;
}

export async function deleteTimeEntry(entry: HarvestTimeEntry) {
  await harvestAPI<HarvestTimeEntryResponse>({
    url: `/time_entries/${entry.id}`,
    method: "DELETE",
  });
  refreshMenuBar();
  return true;
}

export async function refreshMenuBar() {
  try {
    await launchCommand({ extensionName: "harvest", name: "menu-bar", type: LaunchType.Background });
  } catch {
    console.log("failed to refresh menu bar");
  }
}

export function formatHours(hours: string | undefined, company: HarvestCompany | undefined): string {
  if (!hours) return "";
  const { timeFormat }: Preferences = getPreferenceValues();

  if (timeFormat === "hours_minutes" || (timeFormat === "company" && company?.time_format === "hours_minutes")) {
    const time = hours.split(".");
    const hour = time[0];
    const minute = parseFloat(`0.${time[1]}`) * 60;
    return `${hour}:${minute < 10 ? "0" : ""}${minute.toFixed(0)}`;
  }
  return hours;
}

export async function toggleTimer(): Promise<{ action: "started" | "stopped" | "failed" }> {
  const timeEntries = await getMyTimeEntries();
  const runningEntry = timeEntries.find((o) => o.is_running);
  if (runningEntry) {
    // stop the running timer
    await stopTimer(runningEntry);
    return { action: "stopped" };
  } else if (timeEntries.length > 0) {
    // re-start the most recent timer
    const sortedEntries = timeEntries.sort((a, b) => {
      if (dayjs(a.updated_at).isSame(dayjs(b.updated_at))) {
        return b.is_running ? 1 : -1;
      }
      return dayjs(a.updated_at).isAfter(dayjs(b.updated_at)) ? -1 : 1;
    });
    await restartTimer(sortedEntries[0]);
    return { action: "started" };
  } else {
    return { action: "failed" };
  }
}
