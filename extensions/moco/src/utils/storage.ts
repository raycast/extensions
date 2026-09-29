import { LocalStorage } from "@raycast/api";
import { Project } from "../commands/projects/types";
import { User } from "../commands/user/types";
import { Activity } from "../commands/activities/types";

export enum StatusType {
  favorite = "favorite",
  hidden = "hidden",
}

export type StatusKind = "project" | "task";

const statusKey = (kind: StatusKind, id: number): string => `status:${kind}:${id}`;

const parseStatus = (value: unknown): StatusType | undefined =>
  Object.values(StatusType).includes(value as StatusType) ? (value as StatusType) : undefined;

export const setStatus = async (kind: StatusKind, id: number, status: StatusType): Promise<void> => {
  await LocalStorage.setItem(statusKey(kind, id), status);
};

export const removeStatus = async (kind: StatusKind, id: number): Promise<void> => {
  await LocalStorage.removeItem(statusKey(kind, id));
};

export const getAllStatus = async (kind: StatusKind): Promise<Map<number, StatusType>> => {
  const prefix = `status:${kind}:`;
  const statuses = new Map<number, StatusType>();
  for (const [key, value] of Object.entries(await LocalStorage.allItems())) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const status = parseStatus(value);
    if (status !== undefined) {
      statuses.set(Number(key.slice(prefix.length)), status);
    }
  }
  return statuses;
};

export const storeUser = async (user: User) => {
  return LocalStorage.setItem("user", JSON.stringify(user));
};

export const getUser = async (): Promise<User | undefined> => {
  return LocalStorage.getItem("user").then((user) => {
    if (user === undefined) {
      return undefined;
    } else {
      return JSON.parse(user.toString());
    }
  });
};

export const storeTodaysActivities = async (activities: Activity[]) => {
  return LocalStorage.setItem("todays_activities", JSON.stringify(activities));
};

export const getTodaysActivities = async (): Promise<Activity[]> => {
  const activities = await LocalStorage.getItem("todays_activities");
  if (activities === undefined) {
    return [];
  } else {
    return JSON.parse(activities.toString());
  }
};

export const storeProjects = async (projects: Project[]): Promise<void> => {
  return LocalStorage.setItem("projects", JSON.stringify(projects));
};

export const getProjects = async (): Promise<Project[]> => {
  const projects = await LocalStorage.getItem("projects");
  if (projects === undefined) {
    return [];
  } else {
    return JSON.parse(projects.toString());
  }
};

// Up to v1.1.4, "Add Project to Favorites" and "Hide Project" both wrote "<projectId>" = "favorite".
// Nothing reads these keys. Remove them once, then remember that the cleanup ran.
const LEGACY_CLEANUP_KEY = "cleanup:legacy-status-keys";

export const removeLegacyStatusKeys = async (): Promise<void> => {
  if ((await LocalStorage.getItem(LEGACY_CLEANUP_KEY)) !== undefined) {
    return;
  }
  const items = await LocalStorage.allItems();
  const legacyKeys = Object.entries(items)
    .filter(([key, value]) => /^\d+$/.test(key) && (value === "favorite" || value === "hidden"))
    .map(([key]) => key);
  await Promise.all(legacyKeys.map((key) => LocalStorage.removeItem(key)));
  await LocalStorage.setItem(LEGACY_CLEANUP_KEY, true);
};

// How the menu bar shows a customer: inline (own section), as a submenu, or not at all.
// Key: customer ID, 0 = "Other".
export enum CustomerLayout {
  inline = "inline",
  submenu = "submenu",
  hidden = "hidden",
}

const CUSTOMER_LAYOUTS_KEY = "menu-bar:customer-layouts";

export const getCustomerLayouts = async (): Promise<Record<number, CustomerLayout>> => {
  const layouts = await LocalStorage.getItem<string>(CUSTOMER_LAYOUTS_KEY);
  return layouts === undefined ? {} : JSON.parse(layouts);
};

export const storeCustomerLayouts = async (layouts: Record<number, CustomerLayout>): Promise<void> => {
  await LocalStorage.setItem(CUSTOMER_LAYOUTS_KEY, JSON.stringify(layouts));
};
