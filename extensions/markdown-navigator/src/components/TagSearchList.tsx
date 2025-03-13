// src/components/TagSearchList.tsx
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { isSystemTag, getSystemTag } from "../utils/tagOperations";

interface TagSearchListProps {
  tags: string[];
  onTagSelect: (tag: string) => void;
  selectedTag: string | null;
  showSections?: boolean;
}

export function TagSearchList({ tags, onTagSelect, selectedTag, showSections = true }: TagSearchListProps) {
  console.log("TagSearchList rendered with tags:", tags);
  console.log("Selected tag:", selectedTag);
  console.log("Show sections:", showSections);

  // Separate system tags and custom tags
  const systemTags = tags.filter((tag) => isSystemTag(tag));
  const customTags = tags.filter((tag) => !isSystemTag(tag));

  console.log("System tags:", systemTags);
  console.log("Custom tags:", customTags);

  if (showSections && (systemTags.length > 0 || customTags.length > 0)) {
    return (
      <List navigationTitle="Filter by Tags">
        <List.Item
          title="All Tags"
          icon={Icon.Tag}
          accessories={[{ text: `${tags.length} tags` }]}
          actions={
            <ActionPanel>
              <Action title="Clear Tag Filter" onAction={() => onTagSelect("")} />
            </ActionPanel>
          }
        />

        {systemTags.length > 0 && (
          <List.Section title="System Tags">
            {systemTags.map((tag) => renderTagItem(tag, true, onTagSelect, selectedTag))}
          </List.Section>
        )}

        {customTags.length > 0 && (
          <List.Section title="Custom Tags">
            {customTags.map((tag) => renderTagItem(tag, false, onTagSelect, selectedTag))}
          </List.Section>
        )}
      </List>
    );
  } else {
    // Sort tags with system tags first
    const sortedTags = [...tags].sort((a, b) => {
      const aIsSystem = isSystemTag(a);
      const bIsSystem = isSystemTag(b);

      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;
      return a.localeCompare(b);
    });

    return (
      <List navigationTitle="Filter by Tags">
        <List.Item
          title="All Tags"
          icon={Icon.Tag}
          accessories={[{ text: `${tags.length} tags` }]}
          actions={
            <ActionPanel>
              <Action title="Clear Tag Filter" onAction={() => onTagSelect("")} />
            </ActionPanel>
          }
        />

        {sortedTags.map((tag) => {
          const isSystem = isSystemTag(tag);
          return renderTagItem(tag, isSystem, onTagSelect, selectedTag);
        })}
      </List>
    );
  }
}

function renderTagItem(tag: string, isSystem: boolean, onTagSelect: (tag: string) => void, selectedTag: string | null) {
  const systemTag = isSystem ? getSystemTag(tag) : undefined;
  const isSelected = selectedTag === tag;

  console.log(`Rendering tag: ${tag}, isSystem: ${isSystem}, systemTag:`, systemTag);

  return (
    <List.Item
      key={tag}
      title={`#${tag}`}
      icon={{
        source: isSelected ? Icon.CheckCircle : Icon.Tag,
        tintColor: isSystem
          ? systemTag?.color === "red"
            ? Color.Red
            : systemTag?.color === "yellow"
              ? Color.Yellow
              : systemTag?.color === "green"
                ? Color.Green
                : systemTag?.color === "orange"
                  ? Color.Orange
                  : systemTag?.color === "blue"
                    ? Color.Blue
                    : Color.PrimaryText
          : Color.SecondaryText,
      }}
      accessories={[
        {
          text: isSystem ? "System" : "Custom",
          icon: isSystem ? Icon.Star : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="Filter by Tag" onAction={() => onTagSelect(tag)} />
        </ActionPanel>
      }
    />
  );
}
