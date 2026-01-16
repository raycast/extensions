import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  open,
  Color,
  closeMainWindow,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { loadVessloData } from "./utils/data";
import { VessloApp, VessloData } from "./types";

export default function BrowseByTag() {
  const [data, setData] = useState<VessloData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadVessloData();
    setData(loaded);
    setIsLoading(false);

    if (!loaded) {
      showToast({
        style: Toast.Style.Failure,
        title: "Vesslo data not found",
        message: "Please run Vesslo app first",
      });
    }
  }, []);

  // Get all unique tags with app counts
  const tagGroups = useMemo(() => {
    if (!data) return [];

    const tagMap = new Map<string, VessloApp[]>();

    data.apps.forEach((app) => {
      app.tags.forEach((tag) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }
        tagMap.get(tag)!.push(app);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, apps]) => ({ tag, apps, count: apps.length }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [data]);

  // Apps for selected tag
  const selectedApps = useMemo(() => {
    if (!selectedTag) return [];
    const group = tagGroups.find((g) => g.tag === selectedTag);
    return group?.apps ?? [];
  }, [selectedTag, tagGroups]);

  if (selectedTag) {
    // Show apps for selected tag
    return (
      <List
        isLoading={isLoading}
        navigationTitle={`#${selectedTag}`}
        searchBarPlaceholder={`Search in #${selectedTag}...`}
      >
        <List.Section title={`#${selectedTag} (${selectedApps.length} apps)`}>
          {selectedApps.map((app) => (
            <List.Item
              key={app.id}
              icon={
                app.icon
                  ? { source: `data:image/png;base64,${app.icon}` }
                  : Icon.AppWindow
              }
              title={app.name}
              subtitle={app.developer ?? ""}
              accessories={[
                ...(app.targetVersion
                  ? [{ tag: { value: "UPDATE", color: Color.Green } }]
                  : []),
                ...app.sources.map((s) => ({
                  tag: {
                    value: s,
                    color:
                      s === "Brew"
                        ? Color.Orange
                        : s === "App Store"
                          ? Color.Blue
                          : Color.SecondaryText,
                  },
                })),
              ]}
              actions={
                <ActionPanel>
                  <Action.Open title="Open App" target={app.path} />
                  <Action.ShowInFinder path={app.path} />
                  <Action
                    title="Open in Vesslo"
                    icon={Icon.Link}
                    onAction={async () => {
                      if (app.bundleId) {
                        await closeMainWindow();
                        open(`vesslo://app/${app.bundleId}`);
                      }
                    }}
                  />
                  <Action
                    title="Back to Tags"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={() => setSelectedTag(null)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // Show tag list
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags...">
      {tagGroups.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tag}
          title="No tags found"
          description="Add tags to your apps in Vesslo"
        />
      ) : (
        <List.Section title={`Tags (${tagGroups.length})`}>
          {tagGroups.map(({ tag, count }) => (
            <List.Item
              key={tag}
              icon={{ source: Icon.Tag, tintColor: Color.Purple }}
              title={`#${tag}`}
              accessories={[{ text: `${count} apps` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Apps"
                    icon={Icon.List}
                    onAction={() => setSelectedTag(tag)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
