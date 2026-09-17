import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
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
  clearScripts,
  toggleFavorite,
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

const faviconFor = (target: Target) => getFavicon(target.url ?? `https://${target.match}`, { fallback: Icon.Globe });

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const accessoriesFor = (target: Target): List.Item.Accessory[] => {
  const items: List.Item.Accessory[] = [];
  if (target.favorite) items.push({ icon: Icon.Star, tooltip: "Favourite" });
  if (target.pick && target.pick !== "recent") {
    items.push({ tag: titleCase(target.pick) });
  }
  if (target.strategy && target.strategy !== "hostname") {
    items.push({ tag: titleCase(target.strategy) });
  }
  return items;
};

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
    <List isLoading={isLoading} searchBarPlaceholder="Search open Firefox tabs…">
      {tabs.map((tab) => (
        <List.Item
          key={tab.id}
          icon={tab.favIconUrl ?? getFavicon(tab.url, { fallback: Icon.Globe })}
          title={tab.title}
          subtitle={hostnameOf(tab.url)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add as Target"
                icon={Icon.Plus}
                target={
                  <UpsertTargetForm
                    target={{
                      name: "",
                      title: tab.title,
                      url: tab.url,
                      match: "",
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

export default function ListTabs() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "alpha">("recent");
  const [lastUsed, setLastUsed] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const savedSort = await LocalStorage.getItem<string>("sort");
      if (savedSort === "recent" || savedSort === "alpha") setSort(savedSort);
      const savedUsed = await LocalStorage.getItem<string>("lastUsed");
      if (savedUsed) {
        try {
          setLastUsed(JSON.parse(savedUsed));
        } catch {
          // ignore corrupt state
        }
      }
    })();
  }, []);

  const load = useCallback(async () => {
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
    load();
  }, [load]);

  const handleFocus = async (target: Target) => {
    try {
      await focusTarget(target.name);
      const next = { ...lastUsed, [target.name]: Date.now() };
      setLastUsed(next);
      await LocalStorage.setItem("lastUsed", JSON.stringify(next));
      await closeMainWindow();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Focus failed",
        message: String(err),
      });
    }
  };

  const handleToggleFavorite = async (target: Target) => {
    try {
      await toggleFavorite(target.name);
      await load();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Toggle favourite failed",
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
      await load();
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

  const handleClearScripts = async () => {
    const confirmed = await confirmAlert({
      title: "Delete generated hotkey scripts?",
      message: "Removes the scripts foxhop generated in ~/.config/foxhop/scripts. You can regenerate them anytime.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting hotkey scripts…",
    });
    try {
      const { removed } = await clearScripts();
      toast.style = Toast.Style.Success;
      toast.title = `Removed ${removed} hotkey script${removed === 1 ? "" : "s"}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Delete failed";
      toast.message = String(err);
    }
  };

  const itemActions = (target: Target) => (
    <ActionPanel>
      <Action title="Focus Tab" icon={Icon.Globe} onAction={() => handleFocus(target)} />
      <Action
        title={target.favorite ? "Unfavourite" : "Favourite"}
        icon={Icon.Star}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        onAction={() => handleToggleFavorite(target)}
      />
      <Action.Push
        title="Edit Target"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        target={<UpsertTargetForm target={target} onSave={load} />}
      />
      <Action.Push
        title="Add Target"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<UpsertTargetForm onSave={load} />}
      />
      <Action.Push title="Add from Open Tab" icon={Icon.List} target={<OpenTabPicker onSave={load} />} />
      <Action
        title="Delete Target"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={() => handleDelete(target)}
      />
      <Action title="Generate Hotkey Scripts" icon={Icon.Terminal} onAction={handleGenerateScripts} />
      <Action title="Delete Hotkey Scripts" icon={Icon.Trash} onAction={handleClearScripts} />
      <Action
        title="Open Config File"
        icon={Icon.Document}
        onAction={() => open(`${process.env.HOME}/.config/foxhop/tabs.json`)}
      />
      <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={load} />
    </ActionPanel>
  );

  const renderItem = (target: Target) => (
    <List.Item
      key={target.name}
      icon={faviconFor(target)}
      title={target.title ?? target.name}
      subtitle={target.match}
      accessories={accessoriesFor(target)}
      actions={itemActions(target)}
    />
  );

  const onSortChange = async (value: string) => {
    const next = value === "alpha" ? "alpha" : "recent";
    setSort(next);
    await LocalStorage.setItem("sort", next);
  };

  const sorter = (a: Target, b: Target) =>
    sort === "alpha"
      ? (a.title ?? a.name).localeCompare(b.title ?? b.name)
      : (lastUsed[b.name] ?? 0) - (lastUsed[a.name] ?? 0);

  const favorites = targets.filter((target) => target.favorite).sort(sorter);
  const others = targets.filter((target) => !target.favorite).sort(sorter);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tab targets…"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" value={sort} onChange={onSortChange}>
          <List.Dropdown.Item title="Recently Used" value="recent" />
          <List.Dropdown.Item title="Alphabetical" value="alpha" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No tab targets yet"
        description="Add your first Firefox tab, then focus it from anywhere."
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action.Push title="Add Target" icon={Icon.Plus} target={<UpsertTargetForm onSave={load} />} />
            <Action.Push title="Add from Open Tab" icon={Icon.List} target={<OpenTabPicker onSave={load} />} />
            <Action
              title="Open Config File"
              icon={Icon.Document}
              onAction={() => open(`${process.env.HOME}/.config/foxhop/tabs.json`)}
            />
          </ActionPanel>
        }
      />
      {favorites.length > 0 ? <List.Section title="Favourites">{favorites.map(renderItem)}</List.Section> : null}
      <List.Section title={favorites.length > 0 ? "Tabs" : undefined}>{others.map(renderItem)}</List.Section>
    </List>
  );
}
