import { List } from "@raycast/api";
import { GatewayError, gatewayErrorMessage } from "../lib/types";
import { ChromeActionPanel, type ChromeKind } from "./chrome-actions";

type EmptyCopy = {
  title: string;
  description: string;
  actions: Exclude<ChromeKind, "refresh">;
};

function emptyCopy(error: GatewayError | null): EmptyCopy {
  if (!error) {
    return {
      title: "No bots found",
      description: "Your teammates will show up here once the gateway can see them.",
      actions: "retry",
    };
  }

  switch (error.kind) {
    case "not-configured":
      return {
        title: "Can't reach your bots",
        description: "Open Grok Bot to keep working, or set the gateway URL and token in preferences.",
        actions: "prefs",
      };
    case "credentials-file":
      return {
        title: "Can't use gateway.env",
        description: error.detail,
        actions: "prefs",
      };
    case "unauthorized":
      return {
        title: "Gateway token rejected",
        description: "Check the Gateway Token in extension preferences.",
        actions: "prefs",
      };
    case "unreachable":
      return {
        title: "Can't reach your bots",
        description: error.cause,
        actions: "retry",
      };
    case "rejected":
    case "invalid-response":
      return {
        title: "Couldn't load bots",
        description: gatewayErrorMessage(error),
        actions: "retry",
      };
    default: {
      const _exhaustive: never = error;
      return _exhaustive;
    }
  }
}

export function GatewayEmptyView({ error, onRetry }: { error: GatewayError | null; onRetry: () => void }) {
  const copy = emptyCopy(error);
  return (
    <List.EmptyView
      title={copy.title}
      description={copy.description}
      actions={<ChromeActionPanel kind={copy.actions} onRefresh={onRetry} />}
    />
  );
}

export function SearchEmptyView({ onRefresh }: { onRefresh: () => void }) {
  return (
    <List.EmptyView
      title="No matching bots"
      description="Try another name, or clear the search."
      actions={<ChromeActionPanel kind="refresh" onRefresh={onRefresh} />}
    />
  );
}

export function HiddenBotsEmptyView({ onRefresh }: { onRefresh: () => void }) {
  return (
    <List.EmptyView
      title="Hidden bots"
      description="Search by name to find teammates hidden from the sidebar."
      actions={<ChromeActionPanel kind="refresh" onRefresh={onRefresh} />}
    />
  );
}

export function RosterLoadingView({ onRetry }: { onRetry: () => void }) {
  return (
    <List.EmptyView
      title="Loading teammates"
      description="Names appear as they download."
      actions={<ChromeActionPanel kind="refresh" onRefresh={onRetry} />}
    />
  );
}
