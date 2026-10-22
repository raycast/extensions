import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import {
  CHROME_EXTENSION_URL,
  CONNECT_AN_AI_URL,
  CONNECT_CLAUDE_URL,
  IOS_APP_URL,
  OBSIDIAN_PLUGIN_URL,
  WEB_APP_URL,
} from "../constants";

/**
 * Cross-promotion links to the other Inoh apps, shown in every ActionPanel.
 * Brand marks are Simple Icons SVGs in assets/, tinted to match the theme.
 *
 * AI Assistants is last and carries a robot rather than a brand mark, because
 * it is not one product: it is every assistant that can reach Inoh over MCP.
 * Same name and mark as the row in the web app's Settings.
 */
export function AppsActionSection() {
  return (
    <ActionPanel.Section title="Apps">
      <Action.OpenInBrowser
        title="Connect to Claude"
        icon={{ source: "claude.svg", tintColor: Color.PrimaryText }}
        url={CONNECT_CLAUDE_URL}
      />
      {/* eslint-disable @raycast/prefer-title-case -- "iOS" is Apple's casing, which the rule mangles */}
      <Action.OpenInBrowser
        title="iOS App"
        icon={{ source: "apple.svg", tintColor: Color.PrimaryText }}
        url={IOS_APP_URL}
      />
      {/* eslint-enable @raycast/prefer-title-case */}
      <Action.OpenInBrowser title="Web App" icon={Icon.Globe} url={WEB_APP_URL} />
      <Action.OpenInBrowser
        title="Chrome Extension"
        icon={{ source: "googlechrome.svg", tintColor: Color.PrimaryText }}
        url={CHROME_EXTENSION_URL}
      />
      <Action.OpenInBrowser
        title="Obsidian Plugin"
        icon={{ source: "obsidian.svg", tintColor: Color.PrimaryText }}
        url={OBSIDIAN_PLUGIN_URL}
      />
      <Action.OpenInBrowser
        title="AI Assistants"
        icon={{ source: "smart-toy.svg", tintColor: Color.PrimaryText }}
        url={CONNECT_AN_AI_URL}
      />
    </ActionPanel.Section>
  );
}
