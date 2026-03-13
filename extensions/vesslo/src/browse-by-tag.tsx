import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useState, useMemo } from "react";
import { VessloApp } from "./types";
import { SharedAppListItem } from "./components/SharedAppListItem";
import { useVessloData } from "./utils/useVessloData";

export default function BrowseByTag() {
  const { data, isLoading } = useVessloData();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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
            <SharedAppListItem
              key={app.id}
              app={app}
              showBackToTags
              onBackToTags={() => setSelectedTag(null)}
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
