import {
  Action,
  ActionPanel,
  List,
  LocalStorage,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { getApiClient } from "./api";
import { Note } from "./types";

// Config Quick Add - select default tags from existing tags

const QUICK_ADD_TAGS_KEY = "quick_add_default_tags";

export async function getQuickAddTags(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(QUICK_ADD_TAGS_KEY);
    if (stored) {
      return JSON.parse(stored) as string[];
    }
  } catch {
    // ignore
  }
  return [];
}

export default function ConfigQuickAdd() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");

  // Extract unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((note) => {
      note.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Check if search text is a new tag (not in existing tags)
  const isNewTag = useMemo(() => {
    const trimmed = searchText.trim();
    if (!trimmed) return false;
    return !allTags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase());
  }, [searchText, allTags]);

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!searchText.trim()) return allTags;
    const search = searchText.toLowerCase();
    return allTags.filter((tag) => tag.toLowerCase().includes(search));
  }, [allTags, searchText]);

  // Load notes and saved config
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const api = getApiClient();
        const notesList = await api.getNotes({ limit: 200 });
        setNotes(notesList || []);

        // Load saved tags
        const savedTags = await getQuickAddTags();
        setSelectedTags(new Set(savedTags));
      } catch (error) {
        console.error("Failed to load:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function toggleTag(tag: string) {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);

    await LocalStorage.setItem(
      QUICK_ADD_TAGS_KEY,
      JSON.stringify(Array.from(newSelected)),
    );

    await showToast({
      style: Toast.Style.Success,
      title: newSelected.has(tag) ? `已添加: ${tag}` : `已移除: ${tag}`,
      message: `已选择 ${newSelected.size} 个标签`,
    });
  }

  async function addNewTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;

    const newSelected = new Set(selectedTags);
    newSelected.add(trimmed);
    setSelectedTags(newSelected);

    await LocalStorage.setItem(
      QUICK_ADD_TAGS_KEY,
      JSON.stringify(Array.from(newSelected)),
    );

    await showToast({
      style: Toast.Style.Success,
      title: `已创建并添加: ${trimmed}`,
      message: `已选择 ${newSelected.size} 个标签`,
    });

    setSearchText("");
  }

  async function clearAll() {
    setSelectedTags(new Set());
    await LocalStorage.setItem(QUICK_ADD_TAGS_KEY, JSON.stringify([]));
    await showToast({
      style: Toast.Style.Success,
      title: "已清空",
      message: "已移除所有默认标签",
    });
  }

  const selectedTagsArray = Array.from(selectedTags).sort();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜索或输入新标签..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {/* Current selection summary */}
      {selectedTagsArray.length > 0 && (
        <List.Section
          title={`已选择的默认标签 (${selectedTagsArray.length})`}
          subtitle="Quick Add 时会自动添加这些标签"
        >
          {selectedTagsArray.map((tag) => (
            <List.Item
              key={`selected-${tag}`}
              title={tag}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[{ tag: { value: "已选择", color: Color.Green } }]}
              actions={
                <ActionPanel>
                  <Action
                    title="移除此标签"
                    icon={Icon.Minus}
                    onAction={() => toggleTag(tag)}
                  />
                  <Action
                    title="清空所有"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={clearAll}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Create new tag option */}
      {isNewTag && (
        <List.Section title="创建新标签">
          <List.Item
            title={`创建 "${searchText.trim()}"`}
            subtitle="添加一个新的标签"
            icon={{ source: Icon.PlusCircle, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action
                  title={`创建并添加 "${searchText.trim()}"`}
                  icon={Icon.Plus}
                  onAction={() => addNewTag(searchText)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Available tags from notes */}
      <List.Section
        title="可选标签"
        subtitle={allTags.length > 0 ? "从你的笔记中提取的标签" : undefined}
      >
        {allTags.length === 0 && !isLoading ? (
          <List.Item
            title="暂无可用标签"
            subtitle="你的笔记中还没有标签，可以在上方输入创建新标签"
            icon={Icon.Tag}
          />
        ) : (
          filteredTags
            .filter((tag) => !selectedTags.has(tag))
            .map((tag) => (
              <List.Item
                key={tag}
                title={tag}
                icon={Icon.Tag}
                actions={
                  <ActionPanel>
                    <Action
                      title="添加此标签"
                      icon={Icon.Plus}
                      onAction={() => toggleTag(tag)}
                    />
                  </ActionPanel>
                }
              />
            ))
        )}
        {filteredTags.length === 0 && allTags.length > 0 && !isNewTag && (
          <List.Item
            title="没有匹配的标签"
            subtitle="尝试其他搜索词，或直接输入创建新标签"
            icon={Icon.MagnifyingGlass}
          />
        )}
      </List.Section>
    </List>
  );
}
