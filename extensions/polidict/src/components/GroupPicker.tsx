import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { createApiClient } from "../api";
import type { Group, SupportedLanguage } from "../types";

const PAGE_SIZE = 50;

interface GroupPickerProps {
  currentLanguage: SupportedLanguage;
  selectedGroupIds: string[];
  onSelect: (groupIds: string[]) => void;
}

export function GroupPicker({ currentLanguage, selectedGroupIds, onSelect }: GroupPickerProps) {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set(selectedGroupIds));
  const [page, setPage] = useState(1);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { isLoading } = useCachedPromise(
    async (langCode: string, query: string, pageNum: number) => {
      const client = createApiClient();
      const result = await client.groups.queryGroups(langCode, query || undefined, {
        page: pageNum,
        pageSize: PAGE_SIZE,
      });

      if (pageNum === 1) {
        setAllGroups(result.groups);
      } else {
        setAllGroups((prev) => {
          const existingIds = new Set(prev.map((g) => g.id));
          const newGroups = result.groups.filter((g) => !existingIds.has(g.id));
          return [...prev, ...newGroups];
        });
      }

      setHasMore(result.groups.length === PAGE_SIZE);
      return result.groups;
    },
    [currentLanguage.languageCode, searchText, page],
    {
      keepPreviousData: true,
    },
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    setPage(1);
    setAllGroups([]);
    setHasMore(true);
  }, []);

  function toggleSelection(groupId: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function loadMore() {
    if (!isLoading && hasMore) {
      setPage((p) => p + 1);
    }
  }

  async function handleDone() {
    onSelect(Array.from(selection));
    await showToast({
      style: Toast.Style.Success,
      title: `${selection.size} group${selection.size === 1 ? "" : "s"} selected`,
    });
    pop();
  }

  function clearSelection() {
    setSelection(new Set());
  }

  const selectedGroups = allGroups.filter((g) => selection.has(g.id));
  const unselectedGroups = allGroups.filter((g) => !selection.has(g.id));

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Search groups..."
      navigationTitle="Select Groups"
      throttle
    >
      {selectedGroups.length > 0 && (
        <List.Section title="Selected">
          {selectedGroups.map((group) => (
            <List.Item
              key={group.id}
              icon={{ source: Icon.CheckCircle, tintColor: "green" }}
              title={group.name}
              subtitle={group.description}
              actions={
                <ActionPanel>
                  <Action title="Deselect" icon={Icon.Circle} onAction={() => toggleSelection(group.id)} />
                  <Action
                    title="Done"
                    icon={Icon.Check}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={handleDone}
                  />
                  <Action
                    title="Clear All"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={clearSelection}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title={selectedGroups.length > 0 ? "Available" : undefined}>
        {unselectedGroups.map((group) => (
          <List.Item
            key={group.id}
            icon={Icon.Circle}
            title={group.name}
            subtitle={group.description}
            actions={
              <ActionPanel>
                <Action title="Select" icon={Icon.CheckCircle} onAction={() => toggleSelection(group.id)} />
                <Action
                  title="Done"
                  icon={Icon.Check}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={handleDone}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {hasMore && !isLoading && (
        <List.Section>
          <List.Item
            icon={Icon.ArrowDown}
            title="Load More..."
            actions={
              <ActionPanel>
                <Action title="Load More" onAction={loadMore} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {allGroups.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Tag}
          title="No groups found"
          description={searchText ? "Try a different search term" : "No groups available"}
        />
      )}
    </List>
  );
}
