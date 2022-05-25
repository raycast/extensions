import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { query } from "./services/requests";

interface State {
  isLoading: boolean;
  query?: string;
  results?: string[];
}

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: false });
  const [toast, setToast] = useState<Toast | undefined>(undefined);
  useEffect(() => {
    if (!state.isLoading) {
      return;
    }

    const q = state.query?.trim() ?? "";
    query(q)
      .then((results) => {
        if (toast) {
          toast.hide();
        }
        setState((oldState) => ({ ...oldState, results, isLoading: false }));
      })
      .catch((err) => {
        showToast({
          style: Toast.Style.Failure,
          title: err.message,
        })
          .then((toast) => setToast)
          .catch((err) => console.error("Error Creating Toast"));
      });
  }, [state]);

  return (
    <List
      searchBarPlaceholder="Enter text to query"
      onSearchTextChange={(searchValue) => {
        setState((oldState) => ({ ...oldState, query: searchValue, isLoading: true }));
      }}
      isLoading={state.isLoading}
    >
      {state.results &&
        state.results.map((result, index) => {
          if (result) {
            return (
              <List.Item
                key={index}
                title={result}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy" content={result} />
                  </ActionPanel>
                }
              />
            );
          }
        })}
    </List>
  );
}
