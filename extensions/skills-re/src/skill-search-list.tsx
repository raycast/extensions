import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { searchSkills } from "./api";
import type { Skill, SkillSort } from "./api";
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

const SORT_OPTIONS: { title: string; value: SkillSort }[] = [
  { title: "Trending Downloads", value: "downloads-trending" },
  { title: "All-Time Downloads", value: "downloads-all-time" },
  { title: "Stars", value: "stars" },
  { title: "Newest", value: "newest" },
  { title: "Recently Updated", value: "updated" },
  { title: "Views", value: "views" },
];

export const SkillSearchList = ({ searchMode }: SkillSearchListProps) => {
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<SkillSort>("updated");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cursor, setCursor] = useState("");
  const [isDone, setIsDone] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const isSemanticSearch = searchMode === "semantic";
  const trimmedDraftQuery = draftQuery.trim();
  const requestQuery = isSemanticSearch ? submittedQuery : draftQuery;
  const isSemanticQueryPending = isSemanticSearch && (!submittedQuery || trimmedDraftQuery !== submittedQuery);
  const isSemanticRequestLoading = isSemanticSearch && isLoading && Boolean(submittedQuery);
  const searchBarPlaceholder = isSemanticSearch
    ? "Describe the skill you need"
    : "Search skills by keyword, tag, or category";
  const emptyViewTitle = isSemanticRequestLoading ? "Searching Skills…" : "No Skills Found";
  const emptyViewDescription = isSemanticRequestLoading
    ? `Searching for “${submittedQuery}”`
    : isSemanticSearch
      ? "Try describing the capability, workflow, or tool you need."
      : "Try a different keyword, tag, or category.";

  useEffect(() => {
    if (isSemanticSearch && !submittedQuery) {
      setSkills([]);
      setCursor("");
      setIsDone(true);
      setIsLoading(false);
      return;
    }

    const abort = new AbortController();

    const runSearch = async () => {
      setIsLoading(true);
      try {
        const result = await searchSkills({ limit: 25, query: requestQuery, searchMode, sort });
        if (abort.signal.aborted) {
          return;
        }
        setSkills(result.page);
        setCursor(result.continueCursor);
        setIsDone(result.isDone);
      } catch (error) {
        if (!abort.signal.aborted) {
          await showToast({
            message: getErrorMessage(error),
            style: Toast.Style.Failure,
            title: "Search failed",
          });
        }
      } finally {
        if (!abort.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const timeout = setTimeout(() => {
      void runSearch();
    }, 250);

    return () => {
      abort.abort();
      clearTimeout(timeout);
    };
  }, [isSemanticSearch, requestQuery, searchMode, sort]);

  const submitSemanticSearch = () => {
    if (!trimmedDraftQuery) {
      return;
    }
    setSkills([]);
    setCursor("");
    setIsDone(true);
    setIsLoading(true);
    setSubmittedQuery(trimmedDraftQuery);
  };

  const loadMore = async () => {
    if (!cursor || isDone) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await searchSkills({ cursor, limit: 25, query: requestQuery, searchMode, sort });
      setSkills((current) => [...current, ...result.page]);
      setCursor(result.continueCursor);
      setIsDone(result.isDone);
    } catch (error) {
      await showToast({
        message: getErrorMessage(error),
        style: Toast.Style.Failure,
        title: "Could not load more skills",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
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
      onSearchTextChange={setDraftQuery}
    >
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
      ) : null}
      {isSemanticQueryPending ? null : (
        <List.EmptyView description={emptyViewDescription} icon={Icon.MagnifyingGlass} title={emptyViewTitle} />
      )}
      {isSemanticQueryPending
        ? null
        : skills.map((skill) => (
            <List.Item
              key={skill.id}
              accessories={isSemanticSearch ? savedAccessoriesForSkill(skill) : accessoriesForSkill(skill, sort)}
              icon={skill.isVerified ? Icon.CheckRosette : Icon.Box}
              keywords={keywordsForSkill(skill)}
              subtitle={authorLabelForSkill(skill)}
              title={skill.title}
              actions={<SkillActions detailTarget={<SkillDetail skill={skill} />} skill={skill} />}
            />
          ))}
      {isSemanticQueryPending || isDone ? null : (
        <List.Item
          icon={Icon.ArrowDownCircle}
          title="Load More"
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowDownCircle} title="Load More" onAction={loadMore} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};
