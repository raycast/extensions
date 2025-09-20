import fetch, { FetchError } from "node-fetch";
import { closeMainWindow, showToast, Toast, open, getApplications } from "@raycast/api";
import { Link } from "./searchRequest";

interface SidebarItemProp {
  id: string; // UUID
  name: string;
  color: string; // HEX color
  icon: string; // SF Symbol Name
  count: number; // Number of links in the list.
  type: "filter" | "tag" | "preset" | "folder";
}

interface PresetProp extends SidebarItemProp {
  type: "preset";
}

interface FilterProp extends SidebarItemProp {
  type: "filter";
}

export interface TagProp extends SidebarItemProp {
  type: "tag";
}

export interface FolderProp extends SidebarItemProp {
  type: "folder";
}

export interface AnydockProfile {
  id: string; // UUID
  icon: string; // SF Symbol Name
  documentCount: number; // Number of documents in the profile
  name: string;
}
async function isAnyboxInstalled() {
  const applications = await getApplications();
  return applications.some(
    ({ bundleId }) => bundleId === "cc.anybox.Anybox" || bundleId === "ltd.anybox.Anybox-setapp",
  );
}

export async function checkForAnyboxInstallation() {
  if (!(await isAnyboxInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Anybox is not installed.",
      message: "Install it from here.",
      primaryAction: {
        title: "Anybox on Mac App Store",
        onAction: (toast) => {
          open("https://apps.apple.com/app/anybox-the-bookmark-manager/id1593408455");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function request(path: string, method: string, body?: any, closeWindow = false, headers = {}) {
  const combinedHeaders = { ...headers, "Content-Type": "application/json" };
  return fetch(`http://127.0.0.1:6391/${path}`, {
    method,
    body: JSON.stringify(body),
    headers: combinedHeaders,
  })
    .then((res) => {
      if (res.status === 200) {
        if (closeWindow) {
          closeMainWindow({ clearRootSearch: true });
        }
        return res.json();
      } else {
        return res.text().then((text) => {
          throw new Error(text);
        });
      }
    })
    .catch((error) => {
      handleError(error);
    });
}

export function handleError(error: FetchError) {
  checkForAnyboxInstallation();

  if (error.code === "ECONNREFUSED") {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Connection Failed",
      message: "It looks like Anybox is not running.",
      primaryAction: {
        title: "Open Anybox",
        onAction: async (toast) => {
          open("anybox://show");
          toast.hide();
        },
      },
    };

    showToast(options);
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Command Failed",
      message: error.message,
    });
  }
}

const GET = (path: string, closeWindow = false) => request(path, "GET", undefined, closeWindow);

const POST = (path: string, data: object, closeWindow = false) => {
  return request(path, "POST", data, closeWindow);
};

export async function postAndCloseMainWindow(command: string, data: object = {}) {
  return POST(`${command}`, data, true);
}

export function getAndCloseMainWindow(command: string) {
  return GET(`${command}`, true);
}

export async function fetchTags() {
  return GET("tags") as Promise<[TagProp]>;
}

export async function fetchFolders() {
  return GET("folders") as Promise<[FolderProp]>;
}

export async function fetchProfiles() {
  return GET("anydock-profiles") as Promise<[AnydockProfile]>;
}

export async function fetchSearchEngines(key: string) {
  return request("search-engines", "GET", undefined, false, { "x-api-key": key }) as Promise<[Link]>;
}

async function fetchFilters() {
  return GET("filters") as Promise<[FilterProp]>;
}

async function fetchPresetSidebarItems() {
  return GET("presets") as Promise<[PresetProp]>;
}

export async function fetchSidebar() {
  const presets = fetchPresetSidebarItems();
  const filters = fetchFilters();
  const tags = fetchTags();
  const folders = fetchFolders();
  return Promise.all([presets, filters, tags, folders]).then(([presets, filters, tags, folders]) => {
    const result = [...presets, ...filters, ...tags, ...folders];
    return result;
  });
}
