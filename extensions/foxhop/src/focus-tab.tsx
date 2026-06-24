import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import {
  focusTarget,
  FirefoxTab,
  listOpenTabs,
  listTargets,
  removeTarget,
  syncScripts,
  Target,
} from "./foxhop";
import { UpsertTargetForm } from "./upsert-target-form";

const hostnameOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const slugify = (s: string) =>
  s
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const faviconFor = (target: Target) =>
  getFavicon(target.url ?? `https://${target.match}`, { fallback: Icon.Globe });

type OpenTabPickerProps = {
  onSave: () => void;
};

const OpenTabPicker = ({ onSave }: OpenTabPickerProps) => {
  const [tabs, setTabs] = useState<FirefoxTab[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setTabs(await listOpenTabs());
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load open tabs",
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search open Firefox tabs…"
    >
      {tabs.map((tab) => (
        <List.Item
          key={tab.id}
          icon={tab.favIconUrl ?? getFavicon(tab.url, { fallback: Icon.Globe })}
          title={tab.title}
          subtitle={tab.url}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add as Target"
                icon={Icon.Plus}
                target={
                  <UpsertTargetForm
                    target={{
                      name: slugify(hostnameOf(tab.url)),
                      title: tab.title,
                      url: tab.url,
                      match: hostnameOf(tab.url),
                    }}
                    onSave={onSave}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default function FocusTab() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTargets = useCallback(async () => {
    setIsLoading(true);
    try {
      setTargets(await listTargets());
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load targets",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const handleFocus = async (target: Target) => {
    try {
      await focusTarget(target.name);
      await closeMainWindow();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Focus failed",
        message: String(err),
      });
    }
  };

  const handleDelete = async (target: Target) => {
    const confirmed = await confirmAlert({
      title: "Delete target?",
      message: `Remove "${target.name}" from foxhop?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await removeTarget(target.name);
      await loadTargets();
      await showToast({ style: Toast.Style.Success, title: "Target deleted" });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: String(err),
      });
    }
  };

  const handleGenerateScripts = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating hotkey scripts…",
    });
    try {
      const { written, dir } = await syncScripts();
      toast.style = Toast.Style.Success;
      toast.title = `Generated ${written} hotkey script${written === 1 ? "" : "s"}`;
      toast.message = dir;
      toast.primaryAction = { title: "Open Folder", onAction: () => open(dir) };
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sync failed";
      toast.message = String(err);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tab targets…">
      <List.EmptyView
        title="No tab targets yet"
        description="Add your first Firefox tab, then focus it from anywhere."
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Target"
              icon={Icon.Plus}
              target={<UpsertTargetForm onSave={loadTargets} />}
            />
            <Action.Push
              title="Add from Open Tab"
              icon={Icon.List}
              target={<OpenTabPicker onSave={loadTargets} />}
            />
            <Action
              title="Open Config File"
              icon={Icon.Document}
              onAction={() =>
                open(`${process.env.HOME}/.config/foxhop/tabs.json`)
              }
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={loadTargets}
            />
          </ActionPanel>
        }
      />
      {targets.map((target) => (
        <List.Item
          key={target.name}
          icon={faviconFor(target)}
          title={target.title ?? target.name}
          subtitle={target.match}
          accessories={[{ text: target.pick ?? "recent" }]}
          actions={
            <ActionPanel>
              <Action
                title="Focus"
                icon={Icon.Globe}
                onAction={() => handleFocus(target)}
              />
              <Action.Push
                title="Edit Target"
                icon={Icon.Pencil}
                target={
                  <UpsertTargetForm target={target} onSave={loadTargets} />
                }
              />
              <Action.Push
                title="Add Target"
                icon={Icon.Plus}
                target={<UpsertTargetForm onSave={loadTargets} />}
              />
              <Action.Push
                title="Add from Open Tab"
                icon={Icon.List}
                target={<OpenTabPicker onSave={loadTargets} />}
              />
              <Action
                title="Delete Target"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(target)}
              />
              <Action
                title="Generate Hotkey Scripts"
                icon={Icon.Terminal}
                onAction={handleGenerateScripts}
              />
              <Action
                title="Open Config File"
                icon={Icon.Document}
                onAction={() =>
                  open(`${process.env.HOME}/.config/foxhop/tabs.json`)
                }
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadTargets}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
