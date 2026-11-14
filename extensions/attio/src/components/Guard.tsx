import { useEffect, useState, type JSX } from "react";
import { Action, ActionPanel, Clipboard, Icon, List, openExtensionPreferences, popToRoot } from "@raycast/api";
import type { Scope } from "../api/operations";
import { decide, type GuardInput } from "./guard-decide";

export type GuardViewInput = GuardInput & { onRetry: () => void; errorDetail?: string };

const CopyErrorAction = ({ detail }: { detail?: string }) => (
  <Action
    title="Copy Error"
    icon={Icon.Clipboard}
    shortcut={{ macOS: { modifiers: ["cmd", "shift"], key: "c" }, Windows: { modifiers: ["ctrl", "shift"], key: "c" } }}
    onAction={() => Clipboard.copy(detail ?? "Unknown error")}
  />
);

const SettingsAction = () => (
  <Action
    title="Open Extension Settings"
    icon={Icon.Gear}
    shortcut={{ macOS: { modifiers: ["cmd", "shift"], key: "," }, Windows: { modifiers: ["ctrl", "shift"], key: "," } }}
    onAction={openExtensionPreferences}
  />
);

function Screen(props: {
  icon: Icon;
  title: string;
  description: string;
  primary?: JSX.Element;
  onRetry: () => void;
  errorDetail?: string;
  retryAvailableAt?: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (props.retryAvailableAt === undefined) return;
    const delay = props.retryAvailableAt - Date.now();
    if (delay <= 0) return;
    const t = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(t);
  }, [props.retryAvailableAt]);
  const canRetry = props.retryAvailableAt === undefined || now >= props.retryAvailableAt;

  return (
    <List>
      <List.EmptyView
        icon={props.icon}
        title={props.title}
        description={props.description}
        actions={
          <ActionPanel>
            {props.primary}
            {canRetry && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />}
            <SettingsAction />
            <CopyErrorAction detail={props.errorDetail} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/** Views: `const g = guard(input); if (g) return g;` — null ⇒ render normally. */
export function guard(input: GuardViewInput): JSX.Element | null {
  const d = decide(input);
  switch (d.kind) {
    case "render":
    case "stale": // toast already surfaced by useAttio's onError; keep the data on screen
      return null;
    case "loading":
      return <List isLoading />;
    case "network":
      return (
        <Screen
          icon={Icon.WifiDisabled}
          title="Can't reach Attio"
          description="Check your connection, then try again."
          onRetry={input.onRetry}
          errorDetail={input.errorDetail}
        />
      );
    case "auth":
      return (
        <Screen
          icon={Icon.Key}
          title="Attio rejected this access token"
          description="Update the token in Extension Settings, then relaunch the command."
          primary={
            <Action
              title="Open Extension Settings"
              icon={Icon.Gear}
              onAction={async () => {
                await openExtensionPreferences();
                await popToRoot();
              }}
            />
          }
          onRetry={input.onRetry}
          errorDetail={input.errorDetail}
        />
      );
    case "scopes":
      return (
        <Screen
          icon={Icon.Lock}
          title={`This view needs ${formatScopes(d.missing)}`}
          description="Edit the token's scopes in Attio (Workspace Settings → Developers → your token), then press Try Again — no relaunch needed."
          primary={
            <Action.OpenInBrowser title="Open Attio Settings" url="https://app.attio.com/_/settings/developers" />
          }
          onRetry={input.onRetry}
          errorDetail={`Missing scopes: ${d.missing.join(", ")}`}
        />
      );
    case "rate-limited": {
      const secs = d.retryAfterMs !== undefined ? Math.ceil(d.retryAfterMs / 1000) : undefined;
      return (
        <Screen
          icon={Icon.Hourglass}
          title="Attio is rate limiting this workspace"
          description={secs !== undefined ? `Try again in about ${secs}s.` : "Try again shortly."}
          onRetry={input.onRetry}
          errorDetail={input.errorDetail}
          retryAvailableAt={d.retryAfterMs !== undefined ? Date.now() + d.retryAfterMs : undefined}
        />
      );
    }
    case "api-error":
      return (
        <Screen
          icon={Icon.ExclamationMark}
          title="Attio returned an error"
          description={d.code ? `${d.code}: ${d.message}` : d.message}
          onRetry={input.onRetry}
          errorDetail={input.errorDetail ?? d.message}
        />
      );
  }
}

const formatScopes = (missing: readonly Scope[]) => missing.join(" + ");
