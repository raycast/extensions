import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  getPortlessEntries,
  killPortlessEntry,
  type PortlessEntry,
} from "./portless";

type State = {
  entries: PortlessEntry[];
  error?: string;
  isLoading: boolean;
};

export default function Command() {
  const [state, setState] = useState<State>({ entries: [], isLoading: true });
  const loadPorts = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true }));

    try {
      setState({ entries: getPortlessEntries(), isLoading: false });
    } catch (error) {
      setState({
        entries: [],
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    loadPorts();
  }, [loadPorts]);

  if (state.error) {
    return (
      <List isLoading={state.isLoading}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load Portless routes"
          description={state.error}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search Portless routes"
    >
      {state.entries.length === 0 ? (
        <List.EmptyView icon={Icon.CircleDisabled} title="No running routes" />
      ) : (
        state.entries.map((entry) => (
          <List.Item
            key={entry.id}
            id={entry.id}
            title={entry.title}
            subtitle={entry.url}
            icon={Icon.Link}
            keywords={entry.keywords}
            accessories={[{ text: entry.hostname }, { text: `:${entry.port}` }]}
            actions={<RouteActions entry={entry} onRefresh={loadPorts} />}
          />
        ))
      )}
    </List>
  );
}

function RouteActions(props: { entry: PortlessEntry; onRefresh: () => void }) {
  const { entry, onRefresh } = props;

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open URL" url={entry.url} />
      <Action.CopyToClipboard title="Copy Route" content={entry.title} />
      <Action.CopyToClipboard title="Copy URL" content={entry.url} />
      <Action.CopyToClipboard title="Copy Hostname" content={entry.hostname} />
      <Action.CopyToClipboard title="Copy Details" content={entry.raw} />
      {entry.pid !== 0 ? (
        <Action
          title="Kill Port"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={() => killEntry(entry, onRefresh)}
        />
      ) : null}
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
    </ActionPanel>
  );
}

async function killEntry(entry: PortlessEntry, onRefresh: () => void) {
  const confirmed = await confirmAlert({
    title: `Kill ${entry.title}?`,
    message: `This sends SIGTERM to pid ${entry.pid} and removes ${entry.hostname} from Portless routes.`,
    primaryAction: {
      title: "Kill Port",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  try {
    killPortlessEntry(entry);
    await showToast({
      style: Toast.Style.Success,
      title: "Killed Portless route",
      message: entry.title,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not kill route",
      message: getErrorMessage(error),
    });
  } finally {
    onRefresh();
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
