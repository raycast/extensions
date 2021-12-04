import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

import { preferences } from "../../helpers/preferences";
import { SearchState, Dashboard } from "./interface";

interface State {
  items?: string[];
  error?: Error;
}

export function Dashboard() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = { items: ["jqnwd"] }
        setState({ items: feed.items });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchStories();
  }, []);

  console.log(state.items) // Prints stories

  return <List isLoading={!state.items && !state.error} />;
}
