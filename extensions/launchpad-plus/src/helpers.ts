import { LocalStorage } from "@raycast/api";
import EventEmitter from "events";
import { REFRESH_KEY, TAG_DEFINITIONS_KEY, TAG_ORDER_KEY } from "./constants";
import { AppTags, TagDefinitions } from "./types";

export function generateId(): string {
  return `tag_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function randomColor() {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")}`;
}

export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

export async function loadStoredTags(): Promise<{
  tags: AppTags;
  tagDefinitions: TagDefinitions;
  tagOrder: string[];
}> {
  const stored = await LocalStorage.allItems();
  const parsedTags: AppTags = {};
  let definitions: TagDefinitions = {};
  let order: string[] = [];

  if (stored[TAG_DEFINITIONS_KEY]) {
    try {
      definitions = JSON.parse(stored[TAG_DEFINITIONS_KEY] as string);
      // eslint-disable-next-line no-empty
    } catch {}
  }

  if (stored[TAG_ORDER_KEY]) {
    try {
      order = JSON.parse(stored[TAG_ORDER_KEY] as string);
      // eslint-disable-next-line no-empty
    } catch {}
  }

  for (const [key, value] of Object.entries(stored)) {
    if ([TAG_DEFINITIONS_KEY, TAG_ORDER_KEY, REFRESH_KEY].includes(key)) continue;
    try {
      const parsed = JSON.parse(value as string);
      if (Array.isArray(parsed)) parsedTags[key] = parsed;
      // eslint-disable-next-line no-empty
    } catch {}
  }

  const allTagIds = Object.keys(definitions);
  if (order.length === 0) order = allTagIds;
  else order = [...order.filter((id) => allTagIds.includes(id)), ...allTagIds.filter((id) => !order.includes(id))];

  return { tags: parsedTags, tagDefinitions: definitions, tagOrder: order };
}

/* -------------------------------------------------------------------------- */
/*                              Global Event Bus                              */
/* -------------------------------------------------------------------------- */
export const TagEvents = new EventEmitter();
