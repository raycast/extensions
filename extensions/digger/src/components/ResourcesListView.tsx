import { useState } from "react";
import { List, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { DiggerResult } from "../types";
import { getFontDisplayName, getFontSubtitle } from "../utils/fontUtils";
import { truncateText } from "../utils/formatters";

type ResourceType = "all" | "fonts" | "stylesheets" | "scripts";

interface ResourcesListViewProps {
  data: DiggerResult;
  initialFilter?: ResourceType;
}

interface ResourceItem {
  type: "stylesheet" | "script" | "feed" | "font";
  url: string;
  filename: string;
  subtitle?: string;
}

function getFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop() || pathname;
    return filename || urlObj.hostname;
  } catch {
    return url.split("/").pop() || url;
  }
}

function buildResourceItems(data: DiggerResult): ResourceItem[] {
  const items: ResourceItem[] = [];

  // Add stylesheets
  if (data.resources?.stylesheets) {
    for (const sheet of data.resources.stylesheets) {
      items.push({
        type: "stylesheet",
        url: sheet.href,
        filename: getFilename(sheet.href),
        subtitle: sheet.media && sheet.media !== "all" ? `media: ${sheet.media}` : undefined,
      });
    }
  }

  // Add scripts
  if (data.resources?.scripts) {
    for (const script of data.resources.scripts) {
      const attrs = [];
      if (script.async) attrs.push("async");
      if (script.defer) attrs.push("defer");
      items.push({
        type: "script",
        url: script.src,
        filename: getFilename(script.src),
        subtitle: attrs.length > 0 ? attrs.join(", ") : "sync",
      });
    }
  }

  // Add fonts
  if (data.resources?.fonts) {
    for (const font of data.resources.fonts) {
      items.push({
        type: "font",
        url: font.url,
        filename: getFontDisplayName(font),
        subtitle: getFontSubtitle(font),
      });
    }
  }

  return items;
}

function filterItems(items: ResourceItem[], filter: ResourceType): ResourceItem[] {
  if (filter === "all") return items;
  if (filter === "stylesheets") return items.filter((item) => item.type === "stylesheet");
  if (filter === "scripts") return items.filter((item) => item.type === "script");
  if (filter === "fonts") return items.filter((item) => item.type === "font");
  return items;
}

function getIconForType(type: ResourceItem["type"]): Icon {
  switch (type) {
    case "stylesheet":
      return Icon.Brush;
    case "script":
      return Icon.Code;
    case "feed":
      return Icon.Rss;
    case "font":
      return Icon.Text;
  }
}

function getSectionTitle(type: ResourceItem["type"]): string {
  switch (type) {
    case "stylesheet":
      return "Stylesheets";
    case "script":
      return "Scripts";
    case "feed":
      return "Feeds";
    case "font":
      return "Fonts";
  }
}

export function ResourcesListView({ data, initialFilter = "all" }: ResourcesListViewProps) {
  const [filter, setFilter] = useState<ResourceType>(initialFilter);

  const allItems = buildResourceItems(data);
  const filteredItems = filterItems(allItems, filter);

  // Group items by type for section headers
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<string, ResourceItem[]>,
  );

  const sectionOrder: ResourceItem["type"][] = ["font", "stylesheet", "script"];

  return (
    <List
      navigationTitle="Resources"
      searchBarPlaceholder="Filter resources..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Type" value={filter} onChange={(value) => setFilter(value as ResourceType)}>
          <List.Dropdown.Item title="All Resources" value="all" />
          <List.Dropdown.Item title="Fonts" value="fonts" icon={Icon.Text} />
          <List.Dropdown.Item title="Stylesheets" value="stylesheets" icon={Icon.Brush} />
          <List.Dropdown.Item title="Scripts" value="scripts" icon={Icon.Code} />
        </List.Dropdown>
      }
    >
      {sectionOrder.map((type) => {
        const items = groupedItems[type];
        if (!items || items.length === 0) return null;

        return (
          <List.Section key={type} title={getSectionTitle(type)} subtitle={`${items.length}`}>
            {items.map((item, index) => (
              <List.Item
                key={`${type}-${index}`}
                title={item.filename}
                subtitle={item.subtitle}
                icon={getIconForType(item.type)}
                accessories={[{ text: truncateText(item.url, 40) }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={item.url}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={item.url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}

      {filteredItems.length === 0 && <List.EmptyView title="No resources found" icon={Icon.MagnifyingGlass} />}
    </List>
  );
}
