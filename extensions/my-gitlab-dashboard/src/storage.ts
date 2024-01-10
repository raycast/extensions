import { LocalStorage } from "@raycast/api";
import { myUsername as myUsernameFromApi } from "./gitlab/user";
import dayjs, { Dayjs } from "dayjs";
import { MergeRequest } from "./gitlab/mergeRequest";
import { Project } from "./gitlab/project";

export type MrUpdateTimes = Map<string, Dayjs>;

export async function lastMrUpdateTimes(): Promise<MrUpdateTimes> {
  const jsonMapEntries = await LocalStorage.getItem<string>("update_times");
  const jsonEntries = JSON.parse(jsonMapEntries ?? "[]", (key, value) => {
    return key === "1" && typeof value === "string" ? dayjs(value) : value;
  });
  return new Map(jsonEntries);
}

export async function saveLastMrUpdateTimes(mrs: MergeRequest[]) {
  const updateTimes = new Map<string, Dayjs>(mrs.map((mr) => [mr.id, dayjs(mr.updatedAt)]));
  await LocalStorage.setItem("update_times", JSON.stringify(Array.from(updateTimes.entries())));
}

export async function myProjects(): Promise<Project[]> {
  const jsonProjects = await LocalStorage.getItem<string>("my_projects");
  return JSON.parse(jsonProjects ?? "[]") as Project[];
}

export async function saveMyProjects(projects: Project[]) {
  await LocalStorage.setItem("my_projects", JSON.stringify(projects));
}

export const myUsername = async () => (await getMyUsername()) ?? (await fetchAndStoreMyUsername());

async function getMyUsername() {
  return await LocalStorage.getItem<string>("my_user");
}

async function fetchAndStoreMyUsername() {
  console.log("Username not found in local storage");
  const fetched = await myUsernameFromApi();
  console.log(`Storing fetched username '${fetched}'`);
  await LocalStorage.setItem("my_user", fetched);
  return fetched;
}
