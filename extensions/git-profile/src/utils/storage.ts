import { LocalStorage } from "@raycast/api";
import type { Profile } from "@/types";
import crypto from "node:crypto";

type Values = {
  [key: string]: string;
};

export function uniqueKey(): string {
  return crypto.randomUUID();
}

export async function setData(key: string, value: Profile) {
  const data = JSON.stringify(value);
  await LocalStorage.setItem(key, data);
}

export async function getAllItems(): Promise<Profile[]> {
  const data = await LocalStorage.allItems<Values>();
  return Object.values(data)
    .map((v) => JSON.parse(v) as Profile)
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function deleteData(key: string) {
  await LocalStorage.removeItem(key);
}

export async function clear() {
  await LocalStorage.clear();
}
