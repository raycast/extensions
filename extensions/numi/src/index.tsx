import { List, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues, LaunchProps } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect } from "react";
import { checkNumiInstallation, isNumiCliInstalled } from "./services/checkinstall";
import { query, queryWithNumiCli } from "./services/requests";

interface State {
  isLoading: boolean;
  query?: string;
  results?: string[];
}

interface HistoryEntry {
  query: string;
  results: string[];
}

interface NumiArguments {
  queryArgument: string;
}

export interface Preferences {
  max_history_elemets: string;
  use_numi_cli: boolean;
  numi_cli_binary_path: string;
}

export default function Command(props: LaunchProps<{ arguments: NumiArguments }>) {
  const { queryArgument } = props.arguments;
  const { max_history_elemets, use_numi_cli, numi_cli_binary_path } = getPreferenceValues<Preferences>();
  const [apiStatus, setApiStatus] = useState<boolean | undefined>(undefined);
  const [state, setState] = useState<State>({ isLoading: true });
  const [toast, setToast] = useState<Toast | undefined>(undefined);
  const [history, setHistory] = useCachedState<HistoryEntry[]>("history", []);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | string | number | undefined>(undefined);
  const INTERVAL_TIME = 5000;

  const handleUpdateHistory = (q: string | undefined, results: string[]) => {
    setTimeoutId((prev) => {
      clearTimeout(prev);

      return setTimeout(() => {
        if (q && results[0].trim() !== q.trim() && results[0]) {
          setHistory((prev) => {
            const itemFoundIndex = prev.findIndex((entry) => entry.query === q);
            console.log("Busqueda", q, itemFoundIndex, itemFoundIndex > -1 && ![null, undefined, ""].includes(q));
            if (itemFoundIndex && itemFoundIndex > -1 && ![null, undefined, ""].includes(q)) {
              prev[itemFoundIndex] = {
                query: q,
                results,
              };
            } else {
              prev.push({ query: q, results });
            }

            const newHistory = [...prev.slice(-+max_history_elemets || -10)];
            return newHistory;
          });
        }
      }, 1000);
    });
  };

  const queryOnNumi = (q: string | undefined) => {
    if (!use_numi_cli) {
      query(q)
        .then((results) => {
          if (toast) {
            toast.hide();
          }
          setState((oldState) => ({ ...oldState, results, isLoading: false }));

          handleUpdateHistory(q, results);
        })
        .catch((err) => {
          if (err.message.includes("ECONNREFUSED")) {
            setApiStatus(false);
            setState((oldState) => ({ ...oldState, isLoading: false }));
          }

          showToast({
            style: Toast.Style.Failure,
            title: "Something went wrong",
            message: "Please make sure Numi is running",
          })
            .then((toast) => setToast)
            .catch((err) => console.error("Error Creating Toast"));
        });
    } else {
      queryWithNumiCli(q)
        .then((results) => {
          if (toast) {
            toast.hide();
          }
          setState((oldState) => ({ ...oldState, results, isLoading: false }));

          if (results.length > 0) {
            handleUpdateHistory(q, results);
          }
        })
        .catch((err) => {
          console.error(err);
          showToast({
            style: Toast.Style.Failure,
            title: "Something went wrong",
            message: "make sure Numi CLI is installed and binary path is correct",
          })
            .then((toast) => setToast)
            .catch((err) => console.error("Error Creating Toast"));
        });
    }
  };

  const checkApiStatus = () => {
    if (!use_numi_cli) {
      query("1")
        .then(() => setApiStatus(true))
        .catch((err) => {
          if (err.message.includes("ECONNREFUSED")) {
            setApiStatus(false);
          }
        });
    } else {
      isNumiCliInstalled()
        .then(() => setApiStatus(true))
        .catch(() => setApiStatus(false));
    }
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

    if (queryArgument) {
      queryOnNumi(queryArgument);
    }
    return clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      return;
    }
    const q = state.query?.trim() ?? "";
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
        icon="empty-view.png"
        title={
          apiStatus === false
            ? use_numi_cli
              ? "Numi CLI is not installed"
              : "Numi is not running"
            : "Waiting for query..."
        }
        description={
          apiStatus === false
            ? use_numi_cli
              ? "Install numi-cli first"
              : "Start Numi and enable Alfred integration"
            : "E.g.: 1+5..."
        }
      />
      <List.Section title="Current">
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
      </List.Section>
      <List.Section title="History">
        {history &&
          history.reverse().map((entry, index) => {
            return (
              <List.Item
                key={index}
                title={entry.query}
                accessories={[{ text: entry.results[0] }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={entry.results[0]} />
                    <Action.Paste content={entry.results[0]} />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
