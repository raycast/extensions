import type { Keyboard } from "@raycast/api";

import type { Task } from "../domain/task";
import type { BackendCapabilities } from "../infrastructure/backend/TickTickBackend";
import { isAllowedBackendExactTaskUrl, isNativeExactTaskLinkable } from "../platform/taskLinks";

export type TaskActionKey = "complete" | "reopen" | "edit" | "move" | "open-exact" | "search" | "copy" | "refresh";

export type TaskExactLinkStrategy = "backend-url" | "native-project-uri" | undefined;

export type TaskActionMacModifier = "cmd" | "ctrl" | "opt" | "shift";
export type TaskActionWindowsModifier = "ctrl" | "alt" | "shift" | "windows";

export type TaskActionShortcut = Keyboard.Shortcut;

export interface TaskActionDescriptor {
  readonly key: TaskActionKey;
  readonly title: string;
  readonly shortcut?: TaskActionShortcut;
}

function platformShortcut(
  macOS: { modifiers: readonly TaskActionMacModifier[]; key: Keyboard.KeyEquivalent },
  Windows: { modifiers: readonly TaskActionWindowsModifier[]; key: Keyboard.KeyEquivalent }
): TaskActionShortcut {
  const macOSModifiers: Keyboard.KeyModifier[] = [...macOS.modifiers];
  const windowsModifiers: Keyboard.KeyModifier[] = [...Windows.modifiers];
  const shortcut = {
    macOS: { modifiers: macOSModifiers, key: macOS.key },
    Windows: { modifiers: windowsModifiers, key: Windows.key },
  } satisfies Keyboard.Shortcut;

  Object.freeze(macOSModifiers);
  Object.freeze(windowsModifiers);
  Object.freeze(shortcut.macOS);
  Object.freeze(shortcut.Windows);
  return Object.freeze(shortcut);
}

function descriptor(key: TaskActionKey, title: string, shortcut?: TaskActionShortcut): TaskActionDescriptor {
  return Object.freeze(shortcut ? { key, title, shortcut } : { key, title });
}

const ACTION_DESCRIPTORS: Readonly<Record<TaskActionKey, TaskActionDescriptor>> = Object.freeze({
  complete: descriptor(
    "complete",
    "Complete Task",
    platformShortcut({ modifiers: ["cmd"], key: "enter" }, { modifiers: ["ctrl"], key: "enter" })
  ),
  reopen: descriptor(
    "reopen",
    "Reopen Task",
    platformShortcut({ modifiers: ["cmd"], key: "enter" }, { modifiers: ["ctrl"], key: "enter" })
  ),
  edit: descriptor(
    "edit",
    "Edit Task",
    platformShortcut({ modifiers: ["cmd"], key: "e" }, { modifiers: ["ctrl"], key: "e" })
  ),
  move: descriptor(
    "move",
    "Move to List",
    platformShortcut({ modifiers: ["cmd", "shift"], key: "m" }, { modifiers: ["ctrl", "shift"], key: "m" })
  ),
  "open-exact": descriptor(
    "open-exact",
    "Open in TickTick",
    platformShortcut({ modifiers: ["cmd"], key: "o" }, { modifiers: ["ctrl"], key: "o" })
  ),
  search: descriptor(
    "search",
    "Search in TickTick",
    platformShortcut({ modifiers: ["cmd"], key: "f" }, { modifiers: ["ctrl"], key: "f" })
  ),
  copy: descriptor(
    "copy",
    "Copy Task",
    platformShortcut({ modifiers: ["cmd"], key: "c" }, { modifiers: ["ctrl"], key: "c" })
  ),
  refresh: descriptor(
    "refresh",
    "Refresh",
    platformShortcut({ modifiers: ["cmd"], key: "r" }, { modifiers: ["ctrl"], key: "r" })
  ),
});

export function resolveTaskActions(
  task: Task,
  capabilities: BackendCapabilities,
  exactStrategy: TaskExactLinkStrategy
): readonly TaskActionDescriptor[] {
  const actions: TaskActionDescriptor[] = [];

  if (task.status === "open" && capabilities.complete) {
    actions.push(ACTION_DESCRIPTORS.complete);
  } else if (task.status === "completed" && capabilities.reopen) {
    actions.push(ACTION_DESCRIPTORS.reopen);
  }

  if (capabilities.update) actions.push(ACTION_DESCRIPTORS.edit);
  if (capabilities.move) actions.push(ACTION_DESCRIPTORS.move);

  const hasExactAction =
    (exactStrategy === "native-project-uri" && isNativeExactTaskLinkable(task)) ||
    (exactStrategy === "backend-url" && capabilities.exactTaskLink && isAllowedBackendExactTaskUrl(task.exactUrl));
  if (hasExactAction) actions.push(ACTION_DESCRIPTORS["open-exact"]);

  actions.push(ACTION_DESCRIPTORS.search, ACTION_DESCRIPTORS.copy, ACTION_DESCRIPTORS.refresh);

  return Object.freeze(actions);
}
