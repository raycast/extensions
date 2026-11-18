import { randomUUID } from "crypto";

import { LocalStorage } from "@raycast/api";

import type { Item } from "@/components/FakerListItem";
import fakerClient from "@/faker";

export type CustomItem = { id: string; name: string; template: string };

export const CUSTOM_SECTION = "custom";

const STORAGE_KEY = "customItems";

export async function loadCustomItems(): Promise<CustomItem[]> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomItem =>
        typeof item?.id === "string" && typeof item?.name === "string" && typeof item?.template === "string",
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function saveCustomItems(items: CustomItem[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function createCustomItemId() {
  return randomUUID();
}

/**
 * Renders a Faker template such as `{{number.int({"min":5,"max":10})}}` against the current locale.
 * Throws when the template references an unknown method or has malformed syntax.
 */
export function renderTemplate(template: string): string {
  return fakerClient.faker.helpers.fake(template);
}

export function customItemToItem(customItem: CustomItem): Item {
  const getValue = () => {
    try {
      return renderTemplate(customItem.template);
    } catch (error) {
      return `⚠️ ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  return {
    section: CUSTOM_SECTION,
    id: customItem.id,
    title: customItem.name,
    custom: customItem,
    value: getValue(),
    getValue,
  };
}
