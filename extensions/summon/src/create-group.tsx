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
import { saveGroup, generateId } from "./utils/storage";
import { getAllWindows, getDisplays, windowToDisplayId } from "./utils/native";
import { Group, GroupWindow, WindowFrame } from "./utils/types";

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

/** Tag value is JSON-encoded for robustness with growing field count */
interface TagData {
  bundleId: string;
  titleMatch: string;
  appName: string;
  windowId: number;
  frame?: WindowFrame;
  displayId?: string;
}

function encodeTag(data: TagData): string {
  return JSON.stringify(data);
}

function decodeTag(tag: string): TagData | null {
  // Support legacy "::" format for backwards compatibility
  if (!tag.startsWith("{")) {
    const [bundleId, titleMatch, appName, winId] = tag.split("::");
    return {
      bundleId: bundleId ?? "",
      titleMatch: titleMatch ?? "",
      appName: appName ?? "",
      windowId: parseInt(winId, 10) || 0,
    };
  }
  try {
    return JSON.parse(tag) as TagData;
  } catch {
    return null;
  }
}

interface PickerWindow {
  bundleId: string;
  stableTitle: string;
  appName: string;
  windowId: number;
  frame: WindowFrame;
  displayId: string;
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
  const { allWindows } = useMemo(() => {
    try {
      const raw = getAllWindows();
      const displayList = getDisplays();

      // First pass: compute stable titles and count per key
      const entries = raw.map((w) => ({
        bundleId: w.appBundleId,
        appName: w.appName,
        fullTitle: w.windowTitle,
        stableTitle: extractStableTitle(w.windowTitle),
        windowId: w.windowId,
        frame: { x: w.x, y: w.y, width: w.width, height: w.height },
        displayId: windowToDisplayId(
          w.x,
          w.y,
          w.width,
          w.height,
          raw,
          displayList,
        ),
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
          frame: e.frame,
          displayId: e.displayId,
        });
      }

      setIsLoading(false);
      return { allWindows: result };
    } catch {
      setIsLoading(false);
      return { allWindows: [] as PickerWindow[] };
    }
  }, []);

  // Build default tag values from existing group windows (edit mode) — JSON encoded
  const defaultWindows = useMemo<string[]>(() => {
    if (!editGroup) return [];
    return editGroup.windows.map((w) =>
      encodeTag({
        bundleId: w.bundleId,
        titleMatch: w.titleMatch,
        appName: w.appName,
        windowId: w.windowId ?? 0,
        frame: w.frame,
        displayId: w.displayId,
      }),
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
        value: encodeTag({
          bundleId: w.bundleId,
          titleMatch: w.titleMatch,
          appName: w.appName,
          windowId: w.windowId ?? 0,
          frame: w.frame,
          displayId: w.displayId,
        }),
        title: `${w.appName}${w.titleMatch ? `: ${w.titleMatch}` : ""} (saved)`,
      }));
    const liveItems = allWindows.map((w) => ({
      key: `${w.bundleId}::${w.stableTitle}`,
      value: encodeTag({
        bundleId: w.bundleId,
        titleMatch: w.stableTitle,
        appName: w.appName,
        windowId: w.windowId,
        frame: w.frame,
        displayId: w.displayId,
      }),
      title: w.stableTitle ? `${w.appName}: ${w.stableTitle}` : w.appName,
    }));
    return [...savedItems, ...liveItems];
  }, [allWindows, editGroup]);

  async function handleSubmit(
    values: Record<string, string | string[] | boolean>,
  ) {
    const name = (values.groupName as string)?.trim();
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Group name is required",
      });
      return;
    }

    const windowTags = (values.windows as string[]) ?? [];
    const restoreLayout = (values.restoreLayout as boolean) ?? false;
    const relaunchApps = (values.relaunchApps as boolean) ?? false;

    const windows: GroupWindow[] = windowTags
      .map((tag) => {
        const data = decodeTag(tag);
        if (!data) return { bundleId: "", titleMatch: "", appName: "" };
        const result: GroupWindow = {
          bundleId: data.bundleId,
          titleMatch: data.titleMatch,
          appName: data.appName,
          windowId: data.windowId || undefined,
        };
        if (restoreLayout && data.frame) {
          result.frame = data.frame;
          result.displayId = data.displayId;
        }
        return result;
      })
      .filter((w) => w.bundleId);

    saveGroup({
      id: editGroup?.id ?? generateId(),
      name,
      windows,
      restoreLayout: restoreLayout || undefined,
      relaunchApps: relaunchApps || undefined,
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
      <Form.Checkbox
        id="restoreLayout"
        label="Restore window positions and sizes when summoning"
        title="Restore Layout"
        defaultValue={editGroup?.restoreLayout ?? false}
      />
      <Form.Checkbox
        id="relaunchApps"
        label="Offer to relaunch closed apps when summoning"
        title="Relaunch Apps"
        defaultValue={editGroup?.relaunchApps ?? false}
      />
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
