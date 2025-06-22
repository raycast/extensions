// src/components/TagSearchList.tsx
import { List, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { isSystemTag, getSystemTag } from "../utils/tagOperations";
import { getTagTintColor } from "../utils/tagColorUtils";
import { useMemo } from "react";

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

const NAVIGATION_TITLE = "Filter by Tags";

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

  // Render list with sections if enabled and tags exist
  if (showSections && (systemTags.length > 0 || customTags.length > 0)) {
    return (
      <List navigationTitle={NAVIGATION_TITLE}>
        <List.Item
          title="All Tags"
          subtitle="Select a tag to view related items"
          icon={Icon.Tag}
          accessories={[{ text: `${tags.length} tags` }]}
          actions={
            <ActionPanel>
              <Action title="Clear Tag Filter" onAction={() => handleTagSelection("")} />
            </ActionPanel>
          }
        />

        {/* System tags section */}
        {systemTags.length > 0 && (
          <List.Section title="System Tags">
            {systemTags.map((tag) => renderTagItem(tag, true, handleTagSelection, selectedTag))}
          </List.Section>
        )}

        {/* Custom tags section */}
        {customTags.length > 0 && (
          <List.Section title="Custom Tags">
            {customTags.map((tag) => renderTagItem(tag, false, handleTagSelection, selectedTag))}
          </List.Section>
        )}
      </List>
    );
  } else {
    const sortedTags = useMemo(() => {
      return [...tags].sort((a, b) => {
        const aIsSystem = isSystemTag(a);
        const bIsSystem = isSystemTag(b);

        if (aIsSystem && !bIsSystem) return -1;
        if (!aIsSystem && bIsSystem) return 1;
        return a.localeCompare(b);
      });
    }, [tags]);

    return (
      <List navigationTitle={NAVIGATION_TITLE}>
        <List.Item
          title="All Tags"
          icon={Icon.Tag}
          subtitle="Select a tag to view related items"
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

/**
 * Renders a list item for a tag with appropriate styling and actions
 *
 * @param tag - The tag name
 * @param isSystem - Whether this is a system tag
 * @param handleTagSelection - Function to handle tag selection with navigation
 * @param selectedTag - Currently selected tag for highlighting
 */
function renderTagItem(
  tag: string,
  isSystem: boolean,
  handleTagSelection: (tag: string) => void,
  selectedTag: string | null,
) {
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
          <Action title="Filter by Tag" onAction={() => handleTagSelection(tag)} />
        </ActionPanel>
      }
    />
  );
}
