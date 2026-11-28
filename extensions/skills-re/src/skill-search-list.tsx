import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getActiveCredential, searchSkills } from "./api";
import type { SkillSort } from "./api";
import { getErrorMessage } from "./api-error";
import type { SkillSearchMode } from "./search-request";
import { SkillDetail } from "./skill-detail";
import { SkillActions } from "./skill-actions";
import {
  accessoriesForSkill,
  authorLabelForSkill,
  keywordsForSkill,
  savedAccessoriesForSkill,
} from "./skill-list-metadata";

interface SkillSearchListProps {
  searchMode: SkillSearchMode;
}

const PAGE_SIZE = 25;

const SORT_OPTIONS: { title: string; value: SkillSort }[] = [
  { title: "Trending Downloads", value: "downloads-trending" },
  { title: "All-Time Downloads", value: "downloads-all-time" },
  { title: "Stars", value: "stars" },
  { title: "Newest", value: "newest" },
  { title: "Recently Updated", value: "updated" },
  { title: "Views", value: "views" },
];

const fetchSearchSkillsPage =
  (query: string, searchMode: SkillSearchMode, sort: SkillSort) => async (options: { cursor?: string }) => {
    const result = await searchSkills({
      cursor: options.cursor,
      limit: PAGE_SIZE,
      query,
      searchMode,
      sort,
    });

    return {
      cursor: result.continueCursor,
      data: result.page,
      hasMore: !result.isDone,
    };
  };

export const SkillSearchList = ({ searchMode }: SkillSearchListProps) => {
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<SkillSort>("updated");
  const isSemanticSearch = searchMode === "semantic";
  const trimmedDraftQuery = draftQuery.trim();
  const requestQuery = isSemanticSearch ? submittedQuery : draftQuery;
  const isSemanticQueryPending = isSemanticSearch && (!submittedQuery || trimmedDraftQuery !== submittedQuery);
  const searchBarPlaceholder = isSemanticSearch
    ? "Describe the skill you need"
    : "Search skills by keyword, tag, or category";

  const { data: credential } = useCachedPromise(getActiveCredential);
  const { data, error, isLoading, pagination } = useCachedPromise(
    fetchSearchSkillsPage,
    [requestQuery, searchMode, sort],
    {
      execute: !isSemanticSearch || Boolean(submittedQuery),
      failureToastOptions: { title: "Search failed" },
      keepPreviousData: true,
    },
  );

  const skills = data ?? [];
  const isSemanticRequestLoading = isSemanticSearch && isLoading && Boolean(submittedQuery);
  const emptyViewTitle = error
    ? "Could Not Search Skills"
    : isSemanticRequestLoading
      ? "Searching Skills…"
      : "No Skills Found";
  const emptyViewDescription = error
    ? getErrorMessage(error)
    : isSemanticRequestLoading
      ? `Searching for “${submittedQuery}”`
      : isSemanticSearch
        ? "Try describing the capability, workflow, or tool you need."
        : "Try a different keyword, tag, or category.";

  const submitSemanticSearch = () => {
    if (!trimmedDraftQuery) {
      return;
    }
    setSubmittedQuery(trimmedDraftQuery);
  };

  return (
    <List
      isLoading={!isSemanticQueryPending && isLoading}
      pagination={isSemanticQueryPending ? undefined : pagination}
      searchBarAccessory={
        isSemanticSearch ? undefined : (
          <List.Dropdown tooltip="Sort" value={sort} onChange={(value) => setSort(value as SkillSort)}>
            {SORT_OPTIONS.map((option) => (
              <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
            ))}
          </List.Dropdown>
        )
      }
      searchBarPlaceholder={searchBarPlaceholder}
      throttle={!isSemanticSearch}
      onSearchTextChange={setDraftQuery}
    >
      <List.EmptyView
        description={emptyViewDescription}
        icon={error ? Icon.Warning : Icon.MagnifyingGlass}
        title={emptyViewTitle}
      />
      {isSemanticQueryPending ? (
        <List.Item
          id="submit-semantic-search"
          icon={Icon.MagnifyingGlass}
          subtitle={trimmedDraftQuery ? "Press Enter to search" : undefined}
          title={trimmedDraftQuery ? `Search for “${trimmedDraftQuery}”` : "Type a query to search"}
          actions={
            trimmedDraftQuery ? (
              <ActionPanel>
                <Action icon={Icon.MagnifyingGlass} title="Search" onAction={submitSemanticSearch} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        skills.map((skill) => (
          <List.Item
            key={skill.id}
            accessories={isSemanticSearch ? savedAccessoriesForSkill(skill) : accessoriesForSkill(skill, sort)}
            icon={skill.isVerified ? Icon.CheckRosette : Icon.Box}
            keywords={keywordsForSkill(skill)}
            subtitle={authorLabelForSkill(skill)}
            title={skill.title}
            actions={
              <SkillActions
                credential={credential}
                detailTarget={<SkillDetail credential={credential} skill={skill} />}
                skill={skill}
              />
            }
          />
        ))
      )}
    </List>
  );
};
