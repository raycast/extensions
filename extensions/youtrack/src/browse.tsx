// noinspection JSIgnoredPromiseFromCall

import { useEffect, useState } from "react";
import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { ReducedIssue, Youtrack } from "youtrack-rest-client";
import { IssueListItem } from "./components";

interface Preferences {
  instance: string;
  token: string;
  query: string;
  maxIssues: string;
}

interface State {
  isLoading: boolean;
  items: ReducedIssue[];
  project: string | null;
  error?: Error;
  yt: Youtrack | null;
}

// noinspection JSUnusedGlobalSymbols
export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const query = prefs.query;

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
        items: [],
      }));
    }
  }, [prefs.instance, prefs.token]);

  useEffect(() => {
    async function fetchIssues() {
      if (state.yt === null) {
        return;
      }
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const feed = await state.yt.issues.search(query, { $top: Number(prefs.maxIssues) });
        setState((previous) => ({ ...previous, items: feed, isLoading: false }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
          items: [],
        }));
      }
    }

    fetchIssues();
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
