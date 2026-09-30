import { Action, ActionPanel, Icon } from "@raycast/api";
import type { ReactNode } from "react";
import { MOBBIN_ICON } from "../lib/assets";
import {
  MOBBIN_MCP_SETTINGS_URL,
  type SearchHistoryEntry,
  type SearchKind,
} from "../lib/types";

export type OAuthStatus = "checking" | "disconnected" | "connected" | "expired";

type Props = {
  authMode: Preferences["authMode"];
  kind: SearchKind;
  oauthStatus: OAuthStatus;
  optionsTarget: ReactNode;
  history: SearchHistoryEntry[];
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onSelectHistory: (entry: SearchHistoryEntry) => void;
  onClearHistory: () => void;
  onUseExample: (query: string) => void;
};

const EXAMPLES: Record<SearchKind, string[]> = {
  screen: [
    "login screen with biometric authentication",
    "checkout page with promo code field and Apple Pay button",
    "Spotify now-playing screen",
  ],
  flow: [
    "fintech account onboarding",
    "food delivery checkout",
    "upgrade to a paid subscription",
  ],
  section: [
    "SaaS pricing comparison",
    "customer testimonial carousel",
    "footer with newsletter signup",
  ],
};

export function GlobalActions({
  authMode,
  kind,
  oauthStatus,
  optionsTarget,
  history,
  onConnect,
  onDisconnect,
  onRefresh,
  onSelectHistory,
  onClearHistory,
  onUseExample,
}: Props) {
  return (
    <>
      <ActionPanel.Section title="Search">
        <Action.Push
          title="Change Search Options"
          icon={Icon.Gear}
          target={optionsTarget}
        />
        <Action
          title="Refresh Search"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
        />
        <ActionPanel.Submenu
          title="Try Example Search…"
          icon={Icon.MagnifyingGlass}
        >
          {EXAMPLES[kind].map((query) => (
            <Action
              key={query}
              title={query}
              onAction={() => onUseExample(query)}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      {authMode === "oauth-mcp" ? (
        <ActionPanel.Section title="Mobbin OAuth">
          {oauthStatus === "disconnected" ? (
            <Action
              title="Connect Mobbin OAuth"
              icon={MOBBIN_ICON}
              onAction={onConnect}
            />
          ) : null}
          {oauthStatus === "expired" ? (
            <Action
              title="Reconnect Mobbin OAuth"
              icon={MOBBIN_ICON}
              onAction={onConnect}
            />
          ) : null}
          {oauthStatus === "connected" ? (
            <Action
              title="Disconnect Mobbin OAuth Locally"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={onDisconnect}
            />
          ) : null}
          <Action.OpenInBrowser
            title="Manage or Revoke Mobbin Access"
            icon={Icon.Globe}
            url={MOBBIN_MCP_SETTINGS_URL}
          />
        </ActionPanel.Section>
      ) : null}
      {history.length > 0 ? (
        <ActionPanel.Section title="History">
          <ActionPanel.Submenu title="Search History…" icon={Icon.Clock}>
            {history.map((entry) => (
              <Action
                key={entry.id}
                title={entry.query}
                onAction={() => onSelectHistory(entry)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action
            title="Clear Search History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={onClearHistory}
          />
        </ActionPanel.Section>
      ) : null}
    </>
  );
}
