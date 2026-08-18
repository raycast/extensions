import { Action, ActionPanel, Color, Icon, showToast } from "@raycast/api";
import { CHROME_EXTENSION_URL, OBSIDIAN_PLUGIN_URL, WEBSITE_URL } from "../constants";

function _showComingSoonToast(appName: string) {
  void showToast({ title: "Coming soon", message: `${appName} isn't available yet — stay tuned!` });
}

/**
 * Cross-promotion links to the other Inoh apps, shown in every ActionPanel.
 * iOS (App Store listing mid-rebrand) has no public page, so it toasts
 * instead of linking. Brand marks are Simple Icons SVGs in assets/, tinted
 * to match the theme.
 */
export function AppsActionSection() {
  return (
    <ActionPanel.Section title="Apps">
      {/* eslint-disable @raycast/prefer-title-case -- "iOS" is Apple's casing; the rule also mangles "(Coming Soon)" */}
      <Action
        title="iOS App (Coming Soon)"
        icon={{ source: "apple.svg", tintColor: Color.PrimaryText }}
        onAction={() => _showComingSoonToast("The iOS app")}
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
