import React from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useReducer, useMemo } from "react";
import { ARIO } from "@ar.io/sdk";
import { getUndernames, getRoutableUrl, getBestGateway } from "./utils/ao";

interface ArnsRecord {
  name: string;
  transactionId?: string;
}

interface Props {
  record: ArnsRecord;
  defaultGateway: string;
  useWayfinder: boolean;
}

// State management
interface State {
  isLoading: boolean;
  undernames: ArnsRecord[];
  filteredUndernames: ArnsRecord[];
  searchText: string;
  error: string | null;
  routedUrl: string | null;
  routedUndernameUrls: Record<string, string>;
  bestGateway: string;
}

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_UNDERNAMES"; payload: ArnsRecord[] }
  | { type: "SET_FILTERED"; payload: ArnsRecord[] }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_ROUTED_URL"; payload: string | null }
  | { type: "SET_UNDERNAME_URLS"; payload: Record<string, string> }
  | { type: "SET_GATEWAY"; payload: string };

const initialState: State = {
  isLoading: true,
  undernames: [],
  filteredUndernames: [],
  searchText: "",
  error: null,
  routedUrl: null,
  routedUndernameUrls: {},
  bestGateway: "arweave.net",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_UNDERNAMES":
      return { ...state, undernames: action.payload };
    case "SET_FILTERED":
      return { ...state, filteredUndernames: action.payload };
    case "SET_SEARCH":
      return { ...state, searchText: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_ROUTED_URL":
      return { ...state, routedUrl: action.payload };
    case "SET_UNDERNAME_URLS":
      return { ...state, routedUndernameUrls: action.payload };
    case "SET_GATEWAY":
      return { ...state, bestGateway: action.payload };
    default:
      return state;
  }
}

// Utility functions
const isTxId = (id: string) => /^[a-zA-Z0-9-_]{43}$/i.test(id);

const getCommonCharCount = (str1: string, str2: string): number => {
  const set1 = new Set(str1.toLowerCase());
  const set2 = new Set(str2.toLowerCase());
  let common = 0;
  set1.forEach((char) => {
    if (set2.has(char)) common++;
  });
  return common;
};

const getViewBlockUrl = (txId: string) =>
  `https://viewblock.io/arweave/tx/${txId}`;
const getAoLinkUrl = (txId: string) => `https://www.ao.link/#/message/${txId}`;

const UndernamesView: React.FC<Props> = ({
  record,
  defaultGateway,
  useWayfinder,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // URL building utility
  const buildUrl = useMemo(() => {
    return (name: string, isUndername = false) => {
      if (isTxId(name)) {
        return `https://${state.bestGateway}/${name}`;
      }

      if (useWayfinder) {
        if (isUndername) {
          return (
            state.routedUndernameUrls[name] ||
            `https://${name}_${record.name}.${state.bestGateway}`
          );
        }
        return state.routedUrl || `https://${name}.${state.bestGateway}`;
      }

      const cleanGateway = defaultGateway
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");
      return isUndername
        ? `https://${name}_${record.name}.${cleanGateway}`
        : `https://${name}.${cleanGateway}`;
    };
  }, [
    state.bestGateway,
    state.routedUrl,
    state.routedUndernameUrls,
    useWayfinder,
    defaultGateway,
    record.name,
  ]);

  // Action panel generator
  const renderActions = useMemo(() => {
    const renderActionsComponent = (item: ArnsRecord, isUndername = false) => (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title={useWayfinder ? "Open with Wayfinder" : "Open in Browser"}
            url={buildUrl(item.name, isUndername)}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          {item.transactionId && (
            <>
              <Action.OpenInBrowser
                title="View in ao.link"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                url={getAoLinkUrl(item.transactionId)}
              />
              <Action.OpenInBrowser
                title="View in ViewBlock"
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                url={getViewBlockUrl(item.transactionId)}
              />
            </>
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy ArNS Name"
            content={isUndername ? `${item.name}_${record.name}` : item.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Full URL"
            content={buildUrl(item.name, isUndername)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {item.transactionId && (
            <Action.CopyToClipboard
              title="Copy Transaction ID"
              content={item.transactionId}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
    renderActionsComponent.displayName = "RenderActions";
    return renderActionsComponent;
  }, [buildUrl, useWayfinder, record.name]);

  // Filter and sort effect
  useEffect(() => {
    if (!state.undernames) return;

    let filtered = [...state.undernames];
    if (state.searchText) {
      filtered = filtered
        .filter((undername) =>
          undername.name.toLowerCase().includes(state.searchText.toLowerCase()),
        )
        .sort((a, b) => {
          const commonA = getCommonCharCount(a.name, state.searchText);
          const commonB = getCommonCharCount(b.name, state.searchText);
          return commonB - commonA || a.name.localeCompare(b.name);
        });
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    dispatch({ type: "SET_FILTERED", payload: filtered });
  }, [state.searchText, state.undernames]);

  // Gateway setup effect
  useEffect(() => {
    async function setupGatewayAndRouting() {
      if (!useWayfinder) return;

      try {
        const gateway = await getBestGateway(record.name);
        dispatch({ type: "SET_GATEWAY", payload: gateway });

        const urls: Record<string, string> = {};
        await Promise.all(
          state.filteredUndernames.map(async (undername) => {
            if (!isTxId(undername.name)) {
              urls[undername.name] = await getRoutableUrl(
                undername.name,
                gateway,
                true,
                record.name,
              );
            }
          }),
        );
        dispatch({ type: "SET_UNDERNAME_URLS", payload: urls });

        const mainUrl = await getRoutableUrl(record.name, gateway);
        dispatch({ type: "SET_ROUTED_URL", payload: mainUrl });
      } catch {
        dispatch({ type: "SET_GATEWAY", payload: "arweave.net" });
      }
    }
    setupGatewayAndRouting();
  }, [useWayfinder, record.name]);

  // Fetch undernames effect
  useEffect(() => {
    async function fetchUndernames() {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const arIO = ARIO.init();
        const arnsRecord = await arIO.getArNSRecord({ name: record.name });

        if (!arnsRecord?.processId) {
          throw new Error("Could not find process ID for domain");
        }

        const fetchedUndernames = await getUndernames(arnsRecord.processId);
        const sortedUndernames = [...fetchedUndernames].sort((a, b) =>
          a.name.localeCompare(b.name),
        );

        dispatch({ type: "SET_UNDERNAMES", payload: sortedUndernames });
        dispatch({ type: "SET_FILTERED", payload: sortedUndernames });
        dispatch({ type: "SET_ERROR", payload: null });
      } catch {
        dispatch({
          type: "SET_ERROR",
          payload: "Unknown error",
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }

    fetchUndernames();
  }, [record.name]);

  if (state.error) {
    return (
      <List isLoading={state.isLoading}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Undernames"
          description={state.error}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(text) =>
        dispatch({ type: "SET_SEARCH", payload: text })
      }
      searchBarPlaceholder="Search undernames..."
      selectedItemId={
        state.filteredUndernames.length > 0
          ? state.filteredUndernames[0].name
          : record.name
      }
    >
      <List.Section title="Undernames">
        {state.filteredUndernames.map((undername) => (
          <List.Item
            key={undername.name}
            id={undername.name}
            title={`${undername.name}_${record.name}${useWayfinder ? "" : `.${defaultGateway.replace(/^https?:\/\//, "").replace(/\/$/, "")}`}`}
            subtitle={
              useWayfinder
                ? `${undername.name}_${record.name} (Wayfinder)`
                : `${undername.name}_${record.name}.${defaultGateway.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
            }
            actions={renderActions(undername, true)}
          />
        ))}
      </List.Section>

      {!state.searchText && (
        <List.Section title="Original Domain">
          <List.Item
            key={record.name}
            id={record.name}
            title={`${record.name}${useWayfinder ? "" : `.${defaultGateway.replace(/^https?:\/\//, "").replace(/\/$/, "")}`}`}
            subtitle={
              useWayfinder
                ? `${record.name} (Wayfinder)`
                : `${record.name}.${defaultGateway.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
            }
            actions={renderActions(
              { name: record.name, transactionId: record.transactionId },
              false,
            )}
          />
        </List.Section>
      )}
    </List>
  );
};

UndernamesView.displayName = "UndernamesView";
export { UndernamesView };
