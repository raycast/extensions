import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import { executeSQL, useCachedPromise } from "@raycast/utils";

import { Reminder } from "./useData";

// EventKit doesn't expose parent/subtask relationships, so they are read from
// the Reminders SQLite stores instead. Reading them requires Full Disk Access.
const storesDirectory = join(homedir(), "Library/Group Containers/group.com.apple.reminders/Container_v1/Stores");

type SubtaskRow = { childId: string; parentId: string };

async function getSubtaskParents(): Promise<Record<string, string>> {
  const parentIdByChildId: Record<string, string> = {};
  if (!existsSync(storesDirectory)) return parentIdByChildId;

  const stores = readdirSync(storesDirectory).filter((file) => file.startsWith("Data-") && file.endsWith(".sqlite"));

  for (const store of stores) {
    try {
      const rows = await executeSQL<SubtaskRow>(
        join(storesDirectory, store),
        `SELECT child.ZCKIDENTIFIER AS childId, parent.ZCKIDENTIFIER AS parentId
         FROM ZREMCDREMINDER child
         JOIN ZREMCDREMINDER parent ON child.ZPARENTREMINDER = parent.Z_PK
         WHERE child.ZCKIDENTIFIER IS NOT NULL AND parent.ZCKIDENTIFIER IS NOT NULL`,
      );

      for (const row of rows) {
        parentIdByChildId[row.childId] = row.parentId;
      }
    } catch {
      // The store can't be read (e.g. missing Full Disk Access or a schema
      // change) — fall back to displaying a flat list.
    }
  }

  return parentIdByChildId;
}

export function useSubtasks() {
  return useCachedPromise(getSubtaskParents, [], { initialData: {} });
}

export function nestSubtasks(reminders: Reminder[], parentIdByChildId: Record<string, string>): Reminder[] {
  const idsInSection = new Set(reminders.map((reminder) => reminder.id));
  const childrenByParentId = new Map<string, Reminder[]>();
  const topLevel: Reminder[] = [];

  for (const reminder of reminders) {
    const parentId = parentIdByChildId[reminder.id];
    // Only nest under a parent shown in the same section; otherwise keep the
    // reminder where it is so it doesn't disappear.
    if (parentId && idsInSection.has(parentId)) {
      const children = childrenByParentId.get(parentId) ?? [];
      children.push({ ...reminder, isSubtask: true });
      childrenByParentId.set(parentId, children);
    } else {
      topLevel.push(reminder);
    }
  }

  if (childrenByParentId.size === 0) return reminders;

  // Emit each top-level reminder followed by its descendants depth-first so
  // deeper nesting levels are preserved.
  const nested: Reminder[] = [];
  const emittedIds = new Set<string>();

  function emit(reminder: Reminder) {
    if (emittedIds.has(reminder.id)) return;
    emittedIds.add(reminder.id);
    nested.push(reminder);
    for (const child of childrenByParentId.get(reminder.id) ?? []) {
      emit(child);
    }
  }

  for (const reminder of topLevel) {
    emit(reminder);
  }

  // Safety net for malformed data (e.g. a parent cycle): never let a reminder
  // disappear from the list.
  for (const reminder of reminders) {
    emit(reminder);
  }

  return nested;
}
