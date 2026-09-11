import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { CHROME_EXTENSION_URL, IOS_APP_URL, OBSIDIAN_PLUGIN_URL, WEBSITE_URL } from "../constants";

/**
 * Cross-promotion links to the other Inoh apps, shown in every ActionPanel.
 * Brand marks are Simple Icons SVGs in assets/, tinted to match the theme.
 */
export function AppsActionSection() {
  return (
    <ActionPanel.Section title="Apps">
      {/* eslint-disable @raycast/prefer-title-case -- "iOS" is Apple's casing, which the rule mangles */}
      <Action.OpenInBrowser
        title="iOS App"
        icon={{ source: "apple.svg", tintColor: Color.PrimaryText }}
        url={IOS_APP_URL}
      />
      {/* eslint-enable @raycast/prefer-title-case */}
      <Action.OpenInBrowser title="Web App" icon={Icon.Globe} url={WEBSITE_URL} />
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
    </ActionPanel.Section>
  );
}
