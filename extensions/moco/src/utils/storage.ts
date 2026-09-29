import { LocalStorage } from "@raycast/api";

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
