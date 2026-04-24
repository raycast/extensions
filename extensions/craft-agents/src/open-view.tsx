import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildCompound } from "./lib/deeplink";
import { logger } from "./lib/logger";

interface ViewItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  icon: Icon;
}

const VIEWS: ViewItem[] = [
  {
    id: "all-sessions",
    title: "All Sessions",
    subtitle: "Browse every Craft Agents session",
    url: buildCompound("allSessions"),
    icon: Icon.List,
  },
  {
    id: "flagged",
    title: "Flagged Sessions",
    subtitle: "Only sessions you starred",
    url: buildCompound("flagged"),
    icon: Icon.Star,
  },
  {
    id: "sources",
    title: "Sources",
    subtitle: "Configured data sources",
    url: buildCompound("sources"),
    icon: Icon.Plug,
  },
  {
    id: "skills",
    title: "Skills",
    subtitle: "Installed skills",
    url: buildCompound("skills"),
    icon: Icon.Hammer,
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "Craft Agents preferences",
    url: buildCompound("settings"),
    icon: Icon.Cog,
  },
  {
    id: "settings-shortcuts",
    title: "Settings — Shortcuts",
    subtitle: "Keyboard shortcuts",
    url: buildCompound("settings", ["shortcuts"]),
    icon: Icon.Keyboard,
  },
];

async function openView(item: ViewItem): Promise<void> {
  try {
    await open(item.url);
  } catch (err) {
    logger.error("open-view.open_failed", err, { id: item.id });
    await showFailureToast(err, { title: "Failed to open view" });
  }
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Filter views">
      {VIEWS.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          actions={
            <ActionPanel>
              <Action title="Open in Craft Agents" icon={Icon.ArrowRight} onAction={() => openView(item)} />
              <Action.CopyToClipboard title="Copy Deep Link" content={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
