import { useCallback, useEffect, useState } from "react";
import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { IssueListItem } from "./components/IssueListItem";
import { getEmptyIssue } from "./utils";
import type { State, Issue, WorkItem, Command } from "./interfaces";
import _ from "lodash";
import { loadCache, saveCache } from "./cache";
import { YouTrackApi } from "./api/youtrack-api";

interface Preferences {
  instance: string;
  token: string;
  query: string;
  maxIssues: number;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const youTrackApi = YouTrackApi.getInstance();

  const [state, setState] = useState<State>({ isLoading: true, items: [], project: null });

  useEffect(() => {
    try {
      setState({ isLoading: false, items: [], project: null });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        error: error instanceof Error ? error : new Error("Something went wrong"),
        isLoading: false,
        items: [getEmptyIssue()],
      }));
    }
  }, []);

  useEffect(() => {
    async function fetchItems() {
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const cache = await loadCache<Issue>("youtrack-issues");

        if (cache.length) {
          setState((previous) => ({ ...previous, items: cache, isLoading: true }));
        }

        const feed = await youTrackApi.fetchIssues(prefs.query, Number(prefs.maxIssues));
        if (cache.length && _.isEqual(cache, feed)) {
          setState((previous) => ({ ...previous, isLoading: false }));
          return;
        }

        setState((previous) => ({ ...previous, items: feed, isLoading: false }));
        await saveCache<Issue>("youtrack-issues", feed);
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
          items: [],
        }));
      }
    }

    fetchItems();
  }, [prefs.maxIssues, prefs.query, youTrackApi]);

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading issues",
        message: state.error.message,
      });
    }
  }, [state.error]);

  const getIssueDetails = useCallback(
    async (issue: Issue) => {
      return await youTrackApi.fetchIssueDetails(issue);
    },
    [youTrackApi],
  );

  const createWorkItemCb = useCallback(
    async (issue: Issue, workItem: WorkItem) => {
      return await youTrackApi.createWorkItem(issue, workItem);
    },
    [youTrackApi],
  );

  const applyCommandCb = useCallback(
    async (issue: Issue, command: Command) => await youTrackApi.applyCommandToIssue(issue.id, command),
    [youTrackApi],
  );

  const getCommandSuggestions = useCallback(
    async (issue: Issue, command: string) => await youTrackApi.getCommandSuggestions(issue.id, { command }),
    [youTrackApi],
  );

  const getLastCommentCb = useCallback(
    async (issueId: string) => {
      const comments = await youTrackApi.fetchComments(issueId);
      return comments.at(-1) ?? null;
    },
    [youTrackApi],
  );

  const deleteIssueCb = useCallback(
    async (issueId: string) => {
      try {
        await youTrackApi.deleteIssue(issueId);
        setState((previous) => ({
          ...previous,
          items: previous.items.filter((item) => item.id !== issueId),
        }));
        await saveCache(
          "youtrack-issues",
          state.items.filter((item) => item.id !== issueId),
        );
        showToast({
          style: Toast.Style.Success,
          title: "Issue deleted",
        });
      } catch (error) {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed deleting issue",
          message: error instanceof Error ? error.message : "Something went wrong",
        });
      }
    },
    [state.items, youTrackApi],
  );

  return (
    <List isLoading={(!state.items && !state.error) || state.isLoading}>
      {state.items?.map((item, index) => (
        <IssueListItem
          key={item.id}
          item={item}
          index={index}
          instance={prefs.instance}
          resolved={item.resolved}
          getIssueDetailsCb={() => getIssueDetails(item)}
          createWorkItemCb={(workItem: WorkItem) => createWorkItemCb(item, workItem)}
          applyCommandCb={(command: Command) => applyCommandCb(item, command)}
          getCommandSuggestions={(command: string) => getCommandSuggestions(item, command)}
          getLastCommentCb={() => getLastCommentCb(item.id)}
          deleteIssueCb={() => deleteIssueCb(item.id)}
        />
      ))}
    </List>
  );
}
