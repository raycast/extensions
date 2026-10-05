import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  Color,
} from "@raycast/api";
import { useState, useMemo } from "react";
import {
  QUERY_TEMPLATES,
  TEMPLATE_CATEGORIES,
  QueryTemplate,
  TemplateCategory,
} from "./data/templates";
import { PLATFORM_ICONS } from "./schema/types";

function getPlatformAccessories(platforms: string[]): List.Item.Accessory[] {
  return platforms
    .map((p) => ({
      icon: PLATFORM_ICONS[p] || undefined,
      tooltip:
        p === "darwin"
          ? "macOS"
          : p === "linux"
            ? "Linux"
            : p === "windows"
              ? "Windows"
              : p,
    }))
    .filter((a) => a.icon);
}

function TemplateDetail({ template }: { template: QueryTemplate }) {
  const categoryInfo = TEMPLATE_CATEGORIES[template.category];

  const platformColor = (p: string): Color => {
    switch (p) {
      case "darwin":
        return Color.Purple;
      case "linux":
        return Color.Orange;
      case "windows":
        return Color.Blue;
      default:
        return Color.SecondaryText;
    }
  };

  const markdown = `\`\`\`sql\n${template.query}\n\`\`\``;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Category">
            <List.Item.Detail.Metadata.TagList.Item
              text={categoryInfo.label}
              color={Color.Blue}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Platforms">
            {template.platforms.map((p) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={p}
                text={p}
                color={platformColor(p)}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Tags">
            {template.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={tag}
                text={tag}
                color={Color.Blue}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function QueryTemplates() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    TemplateCategory | "all"
  >("all");
  const platform = preferences.defaultPlatform || "darwin";

  const filteredTemplates = useMemo(() => {
    let templates = QUERY_TEMPLATES;

    // Filter by platform
    if (platform !== "all") {
      templates = templates.filter((t) => t.platforms.includes(platform));
    }

    // Filter by category
    if (categoryFilter !== "all") {
      templates = templates.filter((t) => t.category === categoryFilter);
    }

    // Filter by search text
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(lowerSearch) ||
          t.description.toLowerCase().includes(lowerSearch) ||
          t.tags.some((tag) => tag.toLowerCase().includes(lowerSearch)) ||
          t.query.toLowerCase().includes(lowerSearch),
      );
    }

    return templates;
  }, [platform, categoryFilter, searchText]);

  // Group by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, QueryTemplate[]> = {};
    for (const template of filteredTemplates) {
      if (!groups[template.category]) {
        groups[template.category] = [];
      }
      groups[template.category].push(template);
    }
    return groups;
  }, [filteredTemplates]);

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search query templates..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={categoryFilter}
          onChange={(value) =>
            setCategoryFilter(value as TemplateCategory | "all")
          }
        >
          <List.Dropdown.Item title="All Categories" value="all" icon="📋" />
          {Object.entries(TEMPLATE_CATEGORIES).map(([key, info]) => (
            <List.Dropdown.Item
              key={key}
              title={`${info.icon} ${info.label}`}
              value={key}
            />
          ))}
        </List.Dropdown>
      }
    >
      {Object.entries(groupedTemplates).map(([category, templates]) => {
        const categoryInfo = TEMPLATE_CATEGORIES[category as TemplateCategory];
        return (
          <List.Section key={category} title={categoryInfo.label}>
            {templates.map((template) => (
              <List.Item
                key={template.id}
                title={template.name}
                accessories={[...getPlatformAccessories(template.platforms)]}
                detail={<TemplateDetail template={template} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Query"
                        content={template.query}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.Paste
                        title="Paste Query"
                        content={template.query}
                        shortcut={{ modifiers: ["cmd"], key: "v" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Query (Single Line)"
                        content={template.query.replace(/\s+/g, " ").trim()}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
