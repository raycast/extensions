import {
  Clipboard,
  Icon,
  MenuBarExtra,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPortlessEntries, type PortlessEntry } from "./portless";

type State = {
  entries: PortlessEntry[];
  error?: string;
  isLoading: boolean;
  lastUpdated?: Date;
};

export default function Command() {
  const [state, setState] = useState<State>({ entries: [], isLoading: true });

  const loadPorts = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true }));

    try {
      setState({
        entries: getPortlessEntries(),
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (error) {
      setState({
        entries: [],
        error: getErrorMessage(error),
        isLoading: false,
        lastUpdated: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    loadPorts();
  }, [loadPorts]);

  const tooltip = useMemo(() => {
    if (state.error) {
      return "Portless list failed";
    }

    return state.entries.length === 1
      ? "1 running Portless route"
      : `${state.entries.length} running Portless routes`;
  }, [state.entries.length, state.error]);

  return (
    <MenuBarExtra
      icon={state.error ? Icon.ExclamationMark : Icon.Globe}
      title={String(state.entries.length)}
      tooltip={tooltip}
      isLoading={state.isLoading}
    >
      {state.error ? (
        <ErrorItems error={state.error} onRefresh={loadPorts} />
      ) : (
        <PortItems
          entries={state.entries}
          lastUpdated={state.lastUpdated}
          onRefresh={loadPorts}
        />
      )}
    </MenuBarExtra>
  );
}

function PortItems(props: {
  entries: PortlessEntry[];
  lastUpdated?: Date;
  onRefresh: () => void;
}) {
  const { entries, lastUpdated, onRefresh } = props;

  if (entries.length === 0) {
    return (
      <>
        <MenuBarExtra.Item
          title="No running routes"
          icon={Icon.CircleDisabled}
        />
        <MenuBarExtra.Separator />
        <RefreshItem onRefresh={onRefresh} lastUpdated={lastUpdated} />
      </>
    );
  }

  return (
    <>
      <MenuBarExtra.Section title="Running Routes">
        {entries.map((entry) => (
          <MenuBarExtra.Item
            key={entry.id}
            title={getMenuBarTitle(entry)}
            subtitle={`:${entry.port}`}
            icon={Icon.Link}
            tooltip={entry.raw}
            onAction={() => open(entry.url)}
            alternate={
              <MenuBarExtra.Item
                title="Copy Route"
                icon={Icon.Clipboard}
                onAction={() => copyEntry(entry)}
              />
            }
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <RefreshItem onRefresh={onRefresh} lastUpdated={lastUpdated} />
      </MenuBarExtra.Section>
    </>
  );
}

function getMenuBarTitle(entry: PortlessEntry) {
  return `${entry.domain} ${entry.subdomain}`;
}

function ErrorItems(props: { error: string; onRefresh: () => void }) {
  const { error, onRefresh } = props;

  return (
    <>
      <MenuBarExtra.Section title="Error">
        <MenuBarExtra.Item
          title="Unable to load routes"
          subtitle={error}
          icon={Icon.ExclamationMark}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Copy Error"
          icon={Icon.Clipboard}
          onAction={() => Clipboard.copy(error)}
        />
        <RefreshItem onRefresh={onRefresh} />
      </MenuBarExtra.Section>
    </>
  );
}

function RefreshItem(props: { onRefresh: () => void; lastUpdated?: Date }) {
  const { onRefresh, lastUpdated } = props;
  const subtitle = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : undefined;

  return (
    <MenuBarExtra.Item
      title="Refresh"
      subtitle={subtitle}
      icon={Icon.ArrowClockwise}
      onAction={onRefresh}
    />
  );
}

async function copyEntry(entry: PortlessEntry) {
  await Clipboard.copy(entry.title);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied Portless route",
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
