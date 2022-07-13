import { List, ActionPanel, Action, showToast, Toast, Detail, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { checkNumiInstallation } from "./services/checkinstall";
import { query } from "./services/requests";

interface State {
  isLoading: boolean;
  query?: string;
  results?: string[];
}

export default function Command() {
  const [apiStatus, setApiStatus] = useState<boolean | undefined>(undefined);
  const [state, setState] = useState<State>({ isLoading: true });
  const [toast, setToast] = useState<Toast | undefined>(undefined);
  const INTERVAL_TIME = 5000;

  const queryOnNumi = (q: string | undefined) => {
    query(q)
      .then((results) => {
        if (toast) {
          toast.hide();
        }
        setState((oldState) => ({ ...oldState, results, isLoading: false }));
      })
      .catch((err) => {
        if (err.message.includes("ECONNREFUSED")) {
          setApiStatus(false);
        }

        showToast({
          style: Toast.Style.Failure,
          title: err.message,
        })
          .then((toast) => setToast)
          .catch((err) => console.error("Error Creating Toast"));
      });
  };

  const checkApiStatus = () => {
    query("1")
      .then(() => setApiStatus(true))
      .catch((err) => {
        if (err.message.includes("ECONNREFUSED")) {
          setApiStatus(false);
        }
      });
  };

  useEffect(() => {
    if (!apiStatus) {
      checkApiStatus();
    }
    const interval = setInterval(() => {
      if (!apiStatus) {
        checkApiStatus();
      }
    }, INTERVAL_TIME);

    return clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = state.query?.trim() ?? "";
    if (!state.isLoading) {
      return;
    }
    queryOnNumi(q);
  }, [state]);

  checkNumiInstallation();

  return (
    <List
      searchBarPlaceholder="Enter text to query"
      onSearchTextChange={(searchValue) => {
        setState((oldState) => ({ ...oldState, query: searchValue, isLoading: true }));
      }}
      isLoading={state.isLoading}
    >
      <List.EmptyView
        title={apiStatus === false ? "Numi is not running" : "Waiting for calculation..."}
        description={apiStatus === false ? "Start Numi and enable Alfred integration" : ""}
      />
      {state.results &&
        state.results.map((result, index) => {
          if (result) {
            return (
              <List.Item
                key={index}
                title={result}
                icon={Icon.Text}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={result} />
                    <Action.Paste content={result} />
                  </ActionPanel>
                }
              />
            );
          }
        })}
    </List>
  );
}
