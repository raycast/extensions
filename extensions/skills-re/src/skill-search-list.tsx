import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { ApiError, getActiveCredential, listSavedSkills, searchSkills } from "./api";
import type { AuthCredential, Skill, SkillSort } from "./api";
import { getErrorMessage } from "./api-error";
import { validateStoredCredential } from "./credential-validation";
import { createRequestGeneration, invalidatePagination } from "./request-generation";
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
  const [credential, setCredential] = useState<AuthCredential | null>();
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<SkillSort>("updated");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cursor, setCursor] = useState("");
  const [isDone, setIsDone] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [paginationGeneration] = useState(createRequestGeneration);
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

  const resetPagination = useCallback(() => {
    const reset = invalidatePagination(paginationGeneration);
    setCursor(reset.cursor);
    setIsDone(reset.isDone);
  }, [paginationGeneration]);

  useEffect(() => {
    let cancelled = false;

    const loadCredential = async () => {
      try {
        const activeCredential = await validateStoredCredential({
          isUnauthorized: (error) => error instanceof ApiError && error.status === 401,
          load: getActiveCredential,
          validate: async ({ token }) => await listSavedSkills({ limit: 1, token }),
        });
        if (!cancelled) {
          setCredential(activeCredential);
        }
      } catch {
        if (!cancelled) {
          setCredential(null);
        }
      }
    };

    void loadCredential();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    resetPagination();

    if (isSemanticSearch && !submittedQuery) {
      setSkills([]);
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
  }, [isSemanticSearch, requestQuery, resetPagination, searchMode, sort, submittedQuery]);

  const submitSemanticSearch = () => {
    if (!trimmedDraftQuery) {
      return;
    }
    setSkills([]);
    setIsLoading(true);
    resetPagination();
    setSubmittedQuery(trimmedDraftQuery);
  };

  const loadMore = async () => {
    if (!cursor || isDone) {
      return;
    }
    paginationGeneration.invalidate();
    const requestGeneration = paginationGeneration.capture();
    setIsLoading(true);
    try {
      const result = await searchSkills({ cursor, limit: 25, query: requestQuery, searchMode, sort });
      if (!paginationGeneration.isCurrent(requestGeneration)) {
        return;
      }
      setSkills((current) => [...current, ...result.page]);
      setCursor(result.continueCursor);
      setIsDone(result.isDone);
    } catch (error) {
      if (paginationGeneration.isCurrent(requestGeneration)) {
        await showToast({
          message: getErrorMessage(error),
          style: Toast.Style.Failure,
          title: "Could not load more skills",
        });
      }
    } finally {
      if (paginationGeneration.isCurrent(requestGeneration)) {
        setIsLoading(false);
      }
    }
  };

  const updateDraftQuery = (value: string) => {
    if (value === draftQuery) {
      return;
    }
    resetPagination();
    if (isSemanticSearch) {
      setIsLoading(false);
    }
    setDraftQuery(value);
  };

  const updateSort = (value: string) => {
    if (value === sort) {
      return;
    }
    resetPagination();
    setSort(value as SkillSort);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        isSemanticSearch ? undefined : (
          <List.Dropdown tooltip="Sort" value={sort} onChange={updateSort}>
            {SORT_OPTIONS.map((option) => (
              <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
            ))}
          </List.Dropdown>
        )
      }
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={updateDraftQuery}
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
              actions={
                <SkillActions
                  credential={credential}
                  detailTarget={<SkillDetail credential={credential} skill={skill} />}
                  skill={skill}
                />
              }
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
