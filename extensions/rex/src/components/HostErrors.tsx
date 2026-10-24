import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { RexError } from "../rex/cli";
import { hostIcon, STATE_COLORS } from "../rex/status";
import { hostDisplayName, hostKey, type HostError } from "../rex/types";

/** Hosts that could not be read this refresh, shown below the sessions that could. */
export function HostErrorsSection({ errors, onRetry }: { errors: HostError[]; onRetry: () => void }) {
  if (errors.length === 0) return null;
  return (
    <List.Section title="Unreachable Hosts">
      {errors.map(({ host, message }) => (
        <List.Item
          key={hostKey(host)}
          id={`host-error:${hostKey(host)}`}
          title={hostDisplayName(host)}
          subtitle={message}
          icon={{ source: hostIcon(host), tintColor: STATE_COLORS.error }}
          accessories={[{ icon: { source: Icon.Warning, tintColor: STATE_COLORS.error }, tooltip: message }]}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

/** Partial reads still show their sessions, with the reason some data is missing. */
export function SnapshotWarningsSection({ warnings, onRetry }: { warnings: string[]; onRetry: () => void }) {
  if (warnings.length === 0) return null;
  return (
    <List.Section title="Incomplete Data">
      {warnings.map((warning, index) => (
        <List.Item
          key={`${index}:${warning}`}
          id={`snapshot-warning:${index}`}
          title={warning.startsWith("hosts:") ? "Could Not Discover Remote Hosts" : "Some Session Data Is Unavailable"}
          subtitle={warning.replace(/^hosts:\s*/, "")}
          icon={{ source: Icon.Warning, tintColor: STATE_COLORS.error }}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

interface RefreshErrorProps {
  error?: Error;
  /** When the snapshot still on screen was read. */
  fetchedAt: string;
  onRetry: () => void;
}

/** The latest refresh failed, so the rows above are from the last one that worked. */
export function RefreshErrorSection({ error, fetchedAt, onRetry }: RefreshErrorProps) {
  if (!error) return null;
  const unreachable = error instanceof RexError && error.serverUnreachable;
  const updated = new Date(fetchedAt);
  return (
    <List.Section title="Refresh Failed">
      <List.Item
        id="refresh-error"
        title={unreachable ? "Rex Server Unreachable" : "Could Not Refresh"}
        subtitle={error.message}
        icon={{ source: Icon.Warning, tintColor: STATE_COLORS.error }}
        accessories={[{ date: updated, icon: Icon.Clock, tooltip: `Last updated ${updated.toLocaleString()}` }]}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
