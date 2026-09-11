import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGroups, useLearningItems } from "./hooks";
import { createApiClient } from "./api";
import { LearningItemForm } from "./components/LearningItemForm";
import { CurrentLanguageActions } from "./components/CurrentLanguageActions";
import { formatDefinitionsMarkdown } from "./components/DefinitionsList";
import { MatchType, SearchFlag } from "./types";
import type { LearningItem, LearningItemList } from "./types";
import { formatRaycastError, playSpeech } from "./utils";
import StartTraining from "./start-training";
import { CommandShell, type CommandShellContext } from "./core/command-shell";
import {
  invalidateLearningItemsCache,
  invalidateLookupCache,
  invalidateUserProfileCache,
} from "./features/shared/query-keys";

const PAGE_SIZE = 50;
type DefinitionFilter = "all" | "has" | "none";

function ViewVocabularyContent({
  authIdentity,
  currentLanguage,
  languageActions,
  nativeLanguage,
  signOutAction,
}: CommandShellContext) {
  const [searchText, setSearchText] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [definitionFilter, setDefinitionFilter] = useState<DefinitionFilter>("all");
  const [showingDetail, setShowingDetail] = useState(true);

  const [page, setPage] = useState(1);
  const [accumulatedItems, setAccumulatedItems] = useState<LearningItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const lastProcessedPage = useRef(0);

  const { data: groups, isLoading: groupsLoading } = useGroups(currentLanguage, authIdentity, { pageSize: 100 });

  const searchFlags: SearchFlag[] = [];
  if (definitionFilter === "none") {
    searchFlags.push(SearchFlag.NO_DEFINITIONS);
  }

  const filterKey = `${searchText}|${groupFilter}|${definitionFilter}`;

  useEffect(() => {
    setPage(1);
    setAccumulatedItems([]);
    lastProcessedPage.current = 0;
  }, [filterKey, currentLanguage.languageCode]);

  const {
    data: learningItemsData,
    isLoading: itemsLoading,
    revalidate: revalidateHook,
    mutate,
  } = useLearningItems(currentLanguage, authIdentity, {
    textQuery: searchText || undefined,
    matchType: searchText ? MatchType.CONTAINS_IGNORING_CASE_ANYWHERE : undefined,
    groupIds: groupFilter !== "all" ? [groupFilter] : undefined,
    searchFlags: searchFlags.length ? searchFlags : undefined,
    pageParams: { page, pageSize: PAGE_SIZE },
  });

  useEffect(() => {
    if (!learningItemsData || page <= lastProcessedPage.current) return;

    setHasMore(learningItemsData.hasNext);

    if (page === 1) {
      setAccumulatedItems(learningItemsData.learningItems);
    } else {
      setAccumulatedItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = learningItemsData.learningItems.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
    lastProcessedPage.current = page;
  }, [learningItemsData, page]);

  const isLoading = groupsLoading || itemsLoading;

  let items = accumulatedItems;
  if (definitionFilter === "has") {
    items = items.filter((item) => item.definitions && item.definitions.length > 0);
  }

  const revalidate = useCallback(() => {
    setPage(1);
    setAccumulatedItems([]);
    lastProcessedPage.current = 0;
    setTimeout(() => revalidateHook(), 0);
  }, [revalidateHook]);

  function loadMore() {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  }

  async function deleteItem(item: LearningItem) {
    const confirmed = await confirmAlert({
      title: "Delete Item",
      message: `Are you sure you want to delete "${item.text}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const client = createApiClient();

    try {
      await mutate(client.learningItems.deleteLearningItem(currentLanguage.languageCode, item.id), {
        optimisticUpdate: (current): LearningItemList => ({
          learningItems: current?.learningItems.filter((i) => i.id !== item.id) ?? [],
          hasNext: current?.hasNext ?? false,
        }),
        rollbackOnError: true,
        shouldRevalidateAfter: false,
      });

      setAccumulatedItems((prev) => prev.filter((i) => i.id !== item.id));

      invalidateLearningItemsCache(authIdentity, currentLanguage.languageCode);
      invalidateLookupCache(authIdentity, currentLanguage.languageCode);
      invalidateUserProfileCache(authIdentity);
      showToast({ style: Toast.Style.Success, title: "Deleted successfully" });
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    }
  }

  function getGroupNames(groupIds?: string[]): string {
    if (!groupIds?.length || !groups) return "";
    return groupIds
      .map((id) => groups.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }

  function formatItemMarkdown(item: LearningItem): string {
    const parts: string[] = [];

    if (item.imageUrl) {
      parts.push(`<img src="${item.imageUrl}" alt="${item.text}" width="200" />`);
    }

    parts.push(`**${item.text}**`);

    if (item.comment) {
      parts.push(item.comment);
    }

    if (item.definitions?.length) {
      parts.push(`---\n\n${formatDefinitionsMarkdown(item.definitions)}`);
    }

    return parts.join("\n\n");
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter vocabulary..."
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={showingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          storeValue
          onChange={(value) => {
            if (value.startsWith("group:")) {
              setGroupFilter(value.replace("group:", ""));
            } else if (value.startsWith("def:")) {
              setDefinitionFilter(value.replace("def:", "") as DefinitionFilter);
            }
          }}
        >
          <List.Dropdown.Section title="Groups">
            <List.Dropdown.Item title="All Groups" value="group:all" />
            {groups?.map((group) => (
              <List.Dropdown.Item key={group.id} title={group.name} value={`group:${group.id}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Definitions">
            <List.Dropdown.Item title="All" value="def:all" />
            <List.Dropdown.Item title="Has Definitions" value="def:has" />
            <List.Dropdown.Item title="No Definitions" value="def:none" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Book}
          title="No items found"
          description={searchText ? "Try a different search" : "Add words using Lookup Word command"}
          actions={
            currentLanguage ? (
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add New Item"
                  target={
                    <LearningItemForm
                      authIdentity={authIdentity}
                      currentLanguage={currentLanguage}
                      nativeLanguage={nativeLanguage}
                      onSuccess={() => revalidate()}
                    />
                  }
                />
                <CurrentLanguageActions {...languageActions} onLanguageChanged={() => setGroupFilter("all")} />
                {signOutAction}
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        <>
          {items.map((item) => {
            const hasDefinitions = item.definitions && item.definitions.length > 0;
            const groupNames = getGroupNames(item.groupIds);

            return (
              <List.Item
                key={item.id}
                icon={hasDefinitions ? Icon.CheckCircle : Icon.Circle}
                title={item.text}
                subtitle={hasDefinitions ? item.definitions![0].definition : undefined}
                accessories={[
                  ...(groupNames ? [{ tag: groupNames }] : []),
                  ...(hasDefinitions ? [{ text: `${item.definitions!.length} def` }] : []),
                ]}
                detail={<List.Item.Detail markdown={formatItemMarkdown(item)} />}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.Pencil}
                      title="Edit"
                      target={
                        <LearningItemForm
                          authIdentity={authIdentity}
                          currentLanguage={currentLanguage}
                          nativeLanguage={nativeLanguage}
                          existingItem={item}
                          onSuccess={() => revalidate()}
                        />
                      }
                    />
                    <Action.Push
                      icon={Icon.Plus}
                      title="Add New Item"
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={
                        <LearningItemForm
                          authIdentity={authIdentity}
                          currentLanguage={currentLanguage}
                          nativeLanguage={nativeLanguage}
                          onSuccess={() => revalidate()}
                        />
                      }
                    />
                    {groupFilter !== "all" && (
                      <Action.Push
                        icon={Icon.Book}
                        title="Start Training for Group"
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        target={<StartTraining defaultGroupId={groupFilter} />}
                      />
                    )}
                    <Action
                      icon={Icon.SpeakerHigh}
                      title="Play Speech"
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => playSpeech(item.text, item.speechUrl)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Text"
                      content={item.text}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      icon={Icon.Trash}
                      title="Delete"
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => deleteItem(item)}
                    />
                    <Action
                      icon={Icon.ArrowClockwise}
                      title="Refresh"
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => revalidate()}
                    />
                    <CurrentLanguageActions {...languageActions} onLanguageChanged={() => setGroupFilter("all")} />
                    {signOutAction}
                    <Action
                      icon={Icon.Sidebar}
                      title={showingDetail ? "Hide Details" : "Show Details"}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => setShowingDetail(!showingDetail)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
          {hasMore && (
            <List.Item
              icon={isLoading ? Icon.Clock : Icon.ArrowDown}
              title={isLoading ? "Loading…" : "Load More…"}
              actions={
                <ActionPanel>
                  <Action icon={Icon.ArrowDown} title="Load More" onAction={loadMore} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}

export default function ViewVocabulary() {
  return <CommandShell>{(context) => <ViewVocabularyContent {...context} />}</CommandShell>;
}
