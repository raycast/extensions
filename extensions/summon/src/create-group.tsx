import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { saveGroup, getGroups, generateId } from "./utils/storage";
import { getAllWindows } from "./utils/native";
import { Group, GroupWindow } from "./utils/types";

/**
 * Extract the stable part of a window title that identifies the *window*
 * rather than the current tab/file. Many apps (VS Code, Electron) use
 * "detail — project" format — the part after the last " — " is stable.
 * Returns empty string if no stable identifier is found (match any window).
 */
function extractStableTitle(windowTitle: string): string {
  // VS Code / Electron: "file.ts — Project Name"
  const emDashIdx = windowTitle.lastIndexOf(" \u2014 ");
  if (emDashIdx >= 0) {
    return windowTitle.substring(emDashIdx + 3).trim();
  }
  // Browsers / other apps: "Tab Title - Brave Browser"
  const hyphenIdx = windowTitle.lastIndexOf(" - ");
  if (hyphenIdx >= 0) {
    return windowTitle.substring(hyphenIdx + 3).trim();
  }
  return "";
}

interface PickerWindow {
  bundleId: string;
  stableTitle: string;
  appName: string;
  windowId: number;
}

export interface GroupFormProps {
  editGroup?: Group;
  onSaved?: () => void;
}

export function GroupForm({ editGroup, onSaved }: GroupFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!editGroup;

  const [isLoading, setIsLoading] = useState(true);

  // Fetch all windows, extract stable titles, dedupe by bundleId + stableTitle.
  // When multiple windows share the same key (e.g. browser windows with no
  // em-dash project suffix), fall back to the full window title so each
  // window appears as a separate picker item.
  const allWindows = useMemo<PickerWindow[]>(() => {
    try {
      const raw = getAllWindows();

      // First pass: compute stable titles and count per key
      const entries = raw.map((w) => ({
        bundleId: w.appBundleId,
        appName: w.appName,
        fullTitle: w.windowTitle,
        stableTitle: extractStableTitle(w.windowTitle),
        windowId: w.windowId,
      }));

      const keyCount = new Map<string, number>();
      for (const e of entries) {
        const key = `${e.bundleId}::${e.stableTitle}`;
        keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
      }

      // Second pass: for collisions, use full title to distinguish
      const seen = new Set<string>();
      const result: PickerWindow[] = [];
      for (const e of entries) {
        const baseKey = `${e.bundleId}::${e.stableTitle}`;
        const title =
          (keyCount.get(baseKey) ?? 0) > 1 ? e.fullTitle : e.stableTitle;
        const key = `${e.bundleId}::${title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          bundleId: e.bundleId,
          stableTitle: title,
          appName: e.appName,
          windowId: e.windowId,
        });
      }

      setIsLoading(false);
      return result;
    } catch {
      setIsLoading(false);
      return [];
    }
  }, []);

  // Build slot dropdown options showing which slots are taken
  const slotOptions = useMemo(() => {
    const allGroups = getGroups();
    const taken = new Map<number, string>();
    for (const g of allGroups) {
      if (g.slot && g.id !== editGroup?.id) {
        taken.set(g.slot, g.name);
      }
    }
    const options = [{ value: "", title: "None" }];
    for (let i = 1; i <= 5; i++) {
      const owner = taken.get(i);
      options.push({
        value: String(i),
        title: owner ? `Slot ${i} (used by "${owner}")` : `Slot ${i}`,
      });
    }
    return options;
  }, [editGroup]);

  // Build default tag values from existing group windows (edit mode)
  const defaultWindows = useMemo<string[]>(() => {
    if (!editGroup) return [];
    return editGroup.windows.map(
      (w) => `${w.bundleId}::${w.titleMatch}::${w.appName}::${w.windowId ?? 0}`,
    );
  }, [editGroup]);

  // Merge saved group windows into the picker so they appear even if
  // the window is no longer open (prevents defaultValue mismatch)
  const pickerItems = useMemo(() => {
    const liveKeys = new Set(
      allWindows.map((w) => `${w.bundleId}::${w.stableTitle}`),
    );
    const savedItems = (editGroup?.windows ?? [])
      .filter((w) => !liveKeys.has(`${w.bundleId}::${w.titleMatch}`))
      .map((w) => ({
        key: `${w.bundleId}::${w.titleMatch}`,
        value: `${w.bundleId}::${w.titleMatch}::${w.appName}::${w.windowId ?? 0}`,
        title: `${w.appName}${w.titleMatch ? `: ${w.titleMatch}` : ""} (saved)`,
      }));
    const liveItems = allWindows.map((w) => ({
      key: `${w.bundleId}::${w.stableTitle}`,
      value: `${w.bundleId}::${w.stableTitle}::${w.appName}::${w.windowId}`,
      title: w.stableTitle ? `${w.appName}: ${w.stableTitle}` : w.appName,
    }));
    return [...savedItems, ...liveItems];
  }, [allWindows, editGroup]);

  async function handleSubmit(values: Record<string, string | string[]>) {
    const name = (values.groupName as string)?.trim();
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Group name is required",
      });
      return;
    }

    const windowTags = (values.windows as string[]) ?? [];
    const windows: GroupWindow[] = windowTags.map((tag) => {
      const [bundleId, titleMatch, appName, winId] = tag.split("::");
      const windowId = parseInt(winId, 10) || undefined;
      return { bundleId, titleMatch, appName, windowId };
    });

    const slotValue = values.slot as string;
    const slot = slotValue ? parseInt(slotValue, 10) : undefined;

    // Clear slot from any other group that currently holds it
    if (slot) {
      const allGroups = getGroups();
      for (const g of allGroups) {
        if (g.slot === slot && g.id !== (editGroup?.id ?? "")) {
          saveGroup({ ...g, slot: undefined });
        }
      }
    }

    saveGroup({
      id: editGroup?.id ?? generateId(),
      name,
      windows,
      slot,
    });

    await showToast({
      style: Toast.Style.Success,
      title: isEditing ? `Group "${name}" updated` : `Group "${name}" created`,
    });
    onSaved?.();
    pop();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Group" : "Create Group"}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="groupName"
        title="Group Name"
        placeholder="e.g., Web Development"
        defaultValue={editGroup?.name ?? ""}
      />
      <Form.Dropdown
        id="slot"
        title="Hotkey Slot"
        defaultValue={editGroup?.slot ? String(editGroup.slot) : ""}
      >
        {slotOptions.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TagPicker
        id="windows"
        title="Windows"
        defaultValue={defaultWindows}
      >
        {pickerItems.map((item) => (
          <Form.TagPicker.Item
            key={item.key}
            value={item.value}
            title={item.title}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function Command() {
  return <GroupForm />;
}
