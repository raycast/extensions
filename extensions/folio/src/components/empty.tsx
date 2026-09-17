import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { AuthError } from "../lib/auth";
import { ApiError } from "../lib/api";
import { launch, NavigationActions } from "./actions";

export type EmptyKind = "sign-in" | "not-configured" | "connect" | "no-data" | "error";

export function classifyError(error: unknown): EmptyKind {
  if (error instanceof AuthError) return error.reason === "not-configured" ? "not-configured" : "sign-in";
  if (error instanceof ApiError && error.status === 401) return "sign-in";
  return "error";
}

function copy(kind: EmptyKind, error?: unknown) {
  switch (kind) {
    case "sign-in":
      return {
        icon: Icon.Person,
        title: "Sign in to SnapTrade",
        description: "Folio needs a read-only SnapTrade session to load your portfolio.",
      };
    case "not-configured":
      return {
        icon: Icon.Gear,
        title: "Folio isn't configured yet",
        description: "Set the Auth Worker URL and OAuth Client ID in preferences, or enable demo fixtures.",
      };
    case "connect":
      return {
        icon: Icon.Link,
        title: "No brokerage connected",
        description: "Connect a brokerage through SnapTrade to see holdings here.",
      };
    case "no-data":
      return { icon: Icon.Tray, title: "No data yet", description: "SnapTrade hasn't synced anything for this view." };
    default:
      return {
        icon: Icon.ExclamationMark,
        title: "Couldn't load data",
        description: error instanceof Error ? error.message : String(error ?? "Unknown error"),
      };
  }
}

function EmptyActions({ kind, onRetry }: { kind: EmptyKind; onRetry?: () => Promise<void> }) {
  return (
    <ActionPanel>
      {kind === "sign-in" && (
        <Action title="Sign in with SnapTrade" icon={Icon.Person} onAction={() => launch("sign-in")} />
      )}
      {kind === "not-configured" && (
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      )}
      {kind === "connect" && (
        <Action title="Connect Brokerage" icon={Icon.Link} onAction={() => launch("connect-brokerage")} />
      )}
      {onRetry && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />}
      <NavigationActions />
    </ActionPanel>
  );
}

export function ListEmpty({
  kind,
  error,
  onRetry,
}: {
  kind: EmptyKind;
  error?: unknown;
  onRetry?: () => Promise<void>;
}) {
  const c = copy(kind, error);
  return (
    <List.EmptyView
      icon={c.icon}
      title={c.title}
      description={c.description}
      actions={<EmptyActions kind={kind} onRetry={onRetry} />}
    />
  );
}

export function DetailEmpty({
  kind,
  error,
  onRetry,
  isLoading,
}: {
  kind: EmptyKind;
  error?: unknown;
  onRetry?: () => Promise<void>;
  isLoading?: boolean;
}) {
  const c = copy(kind, error);
  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${c.title}\n\n${c.description}`}
      actions={<EmptyActions kind={kind} onRetry={onRetry} />}
    />
  );
}
