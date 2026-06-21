import { Action, ActionPanel, Icon, Image, List, Toast, showToast } from "@raycast/api";
import { getApplications } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { ItemType, getProfiles, runOne } from "./lib/profiles";

interface FlatItem {
  id: string;
  type: ItemType;
  value: string;
  profile: string;
}

const TYPE_LABEL: Record<ItemType, string> = { app: "App", url: "URL", path: "File", command: "Command" };

export default function QuickOpen() {
  const { data: profiles = [], isLoading: loadingProfiles } = useCachedPromise(getProfiles);
  const { data: apps = [] } = useCachedPromise(getApplications);

  const appPaths = useMemo(() => new Map(apps.map((a) => [a.name.toLowerCase(), a.path])), [apps]);

  const items = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = [];
    for (const p of profiles) {
      const add = (type: ItemType, values?: string[]) =>
        (values ?? [])
          .filter((v) => v.trim())
          .forEach((value, i) => out.push({ id: `${p.id}-${type}-${i}`, type, value, profile: p.name }));
      add("app", p.apps);
      add("url", p.urls);
      add("path", p.paths);
      add("command", p.commands.map((c) => c.run).filter(Boolean));
    }
    return out;
  }, [profiles]);

  function iconFor(item: FlatItem): Image.ImageLike {
    switch (item.type) {
      case "app": {
        const path = appPaths.get(item.value.toLowerCase());
        return path ? { fileIcon: path } : Icon.AppWindow;
      }
      case "url":
        return getFavicon(item.value, { fallback: Icon.Globe });
      case "path":
        return { fileIcon: item.value };
      case "command":
        return Icon.Terminal;
    }
  }

  async function open(item: FlatItem) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Opening ${item.value}` });
    try {
      await runOne(item.type, item.value);
      toast.style = Toast.Style.Success;
      toast.title = "Opened";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <List isLoading={loadingProfiles} searchBarPlaceholder="Search any item across rituals…">
      <List.EmptyView icon={Icon.MagnifyingGlass} title="No items" description="Add items to a ritual first." />
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={iconFor(item)}
          title={item.value}
          subtitle={item.profile}
          accessories={[{ tag: TYPE_LABEL[item.type] }]}
          keywords={[item.profile, TYPE_LABEL[item.type]]}
          actions={
            <ActionPanel>
              <Action title="Open" icon={Icon.Play} onAction={() => open(item)} />
              <Action.CopyToClipboard title="Copy Value" content={item.value} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
