import { Action, ActionPanel, Icon, MenuBarExtra, open } from "@raycast/api";

const REPO_URL = "https://github.com/l0kyurue1/showmd";
const REPORT_BUG_URL = `${REPO_URL}/issues/new`;
const REQUEST_FEATURE_URL = `${REPO_URL}/discussions/new?category=ideas`;

// Raycast adds its own Extension Feedback section (report bug / request
// feature, prefilled) to store-installed extensions, so this only needs to
// carry what Raycast doesn't provide.
export default function FeedbackSection() {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser
        title="Star on GitHub"
        icon={Icon.Star}
        url={REPO_URL}
      />
    </ActionPanel.Section>
  );
}

// MenuBarExtra can't nest Action/ActionPanel, so the menu bar gets its own
// section built from MenuBarExtra.Item, wired to the same two URLs.
export function MenuBarFeedbackSection() {
  return (
    <MenuBarExtra.Section title="Feedback">
      <MenuBarExtra.Item
        title="Report Bug"
        icon={Icon.Bug}
        onAction={() => open(REPORT_BUG_URL)}
      />
      <MenuBarExtra.Item
        title="Request Feature"
        icon={Icon.LightBulb}
        onAction={() => open(REQUEST_FEATURE_URL)}
      />
      <MenuBarExtra.Item
        title="Star on GitHub"
        icon={Icon.Star}
        onAction={() => open(REPO_URL)}
      />
    </MenuBarExtra.Section>
  );
}
