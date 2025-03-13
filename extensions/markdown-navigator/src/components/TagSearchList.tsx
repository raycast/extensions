// src/components/TagSearchList.tsx
import { List, ActionPanel, Action, Icon, Color, useNavigation } from "@raycast/api";
import { isSystemTag, getSystemTag } from "../utils/tagOperations";

interface TagSearchListProps {
  tags: string[];
  onTagSelect: (tag: string) => void;
  selectedTag: string | null;
  showSections?: boolean;
}

interface TagsAccumulator {
  systemTags: string[];
  customTags: string[];
}

const TAG_COLOR_MAP: Record<string, Color> = {
  red: Color.Red,
  yellow: Color.Yellow,
  green: Color.Green,
  orange: Color.Orange,
  blue: Color.Blue,
};

function getTagTintColor(isSystem: boolean, systemTag?: { color?: string }): Color {
  if (!isSystem) {
    return Color.SecondaryText;
  }

  return TAG_COLOR_MAP[systemTag?.color || ""] || Color.PrimaryText;
}

export function TagSearchList({ tags, onTagSelect, selectedTag, showSections = true }: TagSearchListProps) {
  const { pop } = useNavigation();

  // Separate system tags and custom tags
  const { systemTags, customTags } = tags.reduce<TagsAccumulator>(
    (acc, tag) => {
      if (isSystemTag(tag)) {
        acc.systemTags.push(tag);
      } else {
        acc.customTags.push(tag);
      }
      return acc;
    },
    { systemTags: [], customTags: [] },
  );

  // Process tag selection and return to main page
  const handleTagSelection = (tag: string) => {
    onTagSelect(tag);
    pop();
  };

  if (showSections && (systemTags.length > 0 || customTags.length > 0)) {
    return (
      <List navigationTitle="Filter by Tags">
        <List.Item
          title="All Tags"
          icon={Icon.Tag}
          accessories={[{ text: `${tags.length} tags` }]}
          actions={
            <ActionPanel>
              <Action title="Clear Tag Filter" onAction={() => handleTagSelection("")} />
            </ActionPanel>
          }
        />

        {systemTags.length > 0 && (
          <List.Section title="System Tags">
            {systemTags.map((tag) => renderTagItem(tag, true, handleTagSelection, selectedTag))}
          </List.Section>
        )}

        {customTags.length > 0 && (
          <List.Section title="Custom Tags">
            {customTags.map((tag) => renderTagItem(tag, false, handleTagSelection, selectedTag))}
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
              <Action title="Clear Tag Filter" onAction={() => handleTagSelection("")} />
            </ActionPanel>
          }
        />

        {sortedTags.map((tag) => {
          const isSystem = isSystemTag(tag);
          return renderTagItem(tag, isSystem, handleTagSelection, selectedTag);
        })}
      </List>
    );
  }
}

function renderTagItem(tag: string, isSystem: boolean, onTagSelect: (tag: string) => void, selectedTag: string | null) {
  const systemTag = isSystem ? getSystemTag(tag) : undefined;
  const isSelected = selectedTag === tag;

  return (
    <List.Item
      key={tag}
      title={`#${tag}`}
      icon={{
        source: isSelected ? Icon.CheckCircle : Icon.Tag,
        tintColor: getTagTintColor(isSystem, systemTag),
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
