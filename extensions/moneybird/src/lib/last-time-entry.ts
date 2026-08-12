import { LocalStorage } from "@raycast/api";

export type LastTimeEntry = {
  description: string;
  customerId: string;
  projectId: string;
  userId: string;
  startDate: string;
  endDate: string;
};

export type LastTimeEntryFormValues = {
  description: string;
  customerId: string;
  projectId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
};

const lastTimeEntryKey = "lastTimeEntry";

export const saveLastTimeEntry = async (entry: LastTimeEntry) => {
  await LocalStorage.setItem(lastTimeEntryKey, JSON.stringify(entry));
};

export const loadLastTimeEntry = async () => {
  const raw = await LocalStorage.getItem<string>(lastTimeEntryKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LastTimeEntry;
    if (!parsed || typeof parsed.startDate !== "string" || typeof parsed.endDate !== "string") return null;
    return parsed;
  } catch (error) {
    console.error("Failed to parse last time entry", error);
    return null;
  }
};

export const toFormInitialValues = (entry: LastTimeEntry): LastTimeEntryFormValues => {
  const todayWithTime = (iso: string) => {
    const source = new Date(iso);
    const today = new Date();
    today.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds());
    return today;
  };

  return {
    description: entry.description ?? "",
    customerId: entry.customerId ?? "",
    projectId: entry.projectId ?? "",
    userId: entry.userId ?? "",
    startDate: todayWithTime(entry.startDate),
    endDate: todayWithTime(entry.endDate),
  };
};
