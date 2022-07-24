// noinspection JSIgnoredPromiseFromCall

import { useEffect, useState } from "react";
import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { Youtrack } from "youtrack-rest-client";
import { IssueListItem } from "./components";
import { fetchIssues, getEmptyIssue, loadCache, saveCache } from "./utils";
import { Preferences, State } from "./interfaces";
import _ from "lodash";

// noinspection JSUnusedGlobalSymbols
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
        const cache = await loadCache();
        const feed = await fetchIssues(prefs.query, Number(prefs.maxIssues), state.yt);
        if (cache.length) {
          if (_.isEqual(cache, feed)) {
            setState((previous) => ({ ...previous, items: cache, isLoading: false }));
          }
        }
        setState((previous) => ({ ...previous, items: feed, isLoading: false }));
        await saveCache(feed);
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

  return (
    <List isLoading={(!state.items && !state.error) || state.isLoading}>
      {state.items?.map((item, index) => (
        <IssueListItem key={item.id} item={item} index={index} instance={prefs.instance} />
      ))}
    </List>
  );
}
