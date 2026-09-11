import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import type { StoredService } from "../types";

export const getServices = async (): Promise<StoredService[]> => {
  const items = await LocalStorage.allItems<Record<string, string>>();
  return Object.entries(items)
    .map(([id, raw]) => {
      try {
        const parsed = JSON.parse(raw) as { title: string; url: string };
        return { id, title: parsed.title, url: parsed.url };
      } catch {
        return null;
      }
    })
    .filter((item): item is StoredService => item !== null)
    .sort((a, b) => a.title.localeCompare(b.title, "en", { numeric: true }));
};

export const saveService = async (title: string, url: string) => {
  const id = randomUUID();
  await LocalStorage.setItem(id, JSON.stringify({ title, url }));
};

export const deleteService = async (id: string) => {
  await LocalStorage.removeItem(id);
};
