import { useCallback, useEffect, useState } from "react";
import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { WorkItem, Youtrack } from "youtrack-rest-client";
import { IssueListItem } from "./components";
import { createWorkItem, fetchIssueDetails, fetchIssues, getEmptyIssue } from "./utils";
import { State, Issue } from "./interfaces";
import _ from "lodash";
import { loadCache, saveCache } from "./cache";

interface Preferences {
  instance: string;
  token: string;
  query: string;
  maxIssues: number;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  const [state, setState] = useState<State>({ isLoading: true, items: [], project: null, yt: null });

  useEffect(() => {
    try {
      const yt = new Youtrack({ baseUrl: prefs.instance, token: prefs.token });
      setState({ isLoading: false, items: [], project: null, yt });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        error: error instanceof Error ? error : new Error("Something went wrong"),
        isLoading: false,
        items: [getEmptyIssue()],
      }));
    }
  }, [prefs.instance, prefs.token]);

  useEffect(() => {
    async function fetchItems() {
      if (state.yt === null) {
        return;
      }
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const cache = await loadCache<Issue>("youtrack-issues");

        if (cache.length) {
          setState((previous) => ({ ...previous, items: cache, isLoading: true }));
        }

        const feed = await fetchIssues(prefs.query, Number(prefs.maxIssues), state.yt);
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
  }, [state.yt]);

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading issues",
        message: state.error.message,
      });
    }
  }, [state.error]);

  const getIssueDetails = useCallback((issue: Issue, yt: Youtrack | null) => {
    if (!yt) {
      return null;
    }
    return fetchIssueDetails(issue, yt);
  }, []);

  const createWorkItemCb = useCallback((issue: Issue, workItem: WorkItem, yt: Youtrack | null) => {
    if (!yt) {
      return null;
    }
    return createWorkItem(issue, workItem, yt);
  }, []);

  return (
    <List isLoading={(!state.items && !state.error) || state.isLoading}>
      {state.items?.map((item, index) => (
        <IssueListItem
          key={item.id}
          item={item}
          index={index}
          instance={prefs.instance}
          resolved={item.resolved}
          getIssueDetailsCb={() => getIssueDetails(item, state.yt)}
          createWorkItemCb={(workItem: WorkItem) => createWorkItemCb(item, workItem, state.yt)}
        />
      ))}
    </List>
  );
}
