import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { StoreItem } from "../types";
import { createStoreDeeplink, extractLatestChanges } from "../utils";
import { useChangelog } from "../hooks/useChangelog";
import { ChangelogDetail } from "./ChangelogDetail";

const GITHUB_EXTENSIONS_BASE = "https://github.com/raycast/extensions/blob/main/extensions";

export function ExtensionActions({ item }: { item: StoreItem }) {
  const storeDeeplink = createStoreDeeplink(item.url);
  const changelogBrowserUrl = item.extensionSlug
    ? `${GITHUB_EXTENSIONS_BASE}/${item.extensionSlug}/CHANGELOG.md`
    : undefined;

  const { data: changelog } = useChangelog(item.extensionSlug);
  const latestChanges = changelog ? extractLatestChanges(changelog) : null;

  return (
    <ActionPanel>
      {item.extensionSlug && (
        <ActionPanel.Section title="Changelog">
          <Action.Push
            title="View Changelog"
            icon={Icon.Document}
            target={<ChangelogDetail slug={item.extensionSlug} title={item.title} />}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          {latestChanges && (
            <Action.CopyToClipboard
              title="Copy Recent Changes"
              content={latestChanges}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          {changelogBrowserUrl && (
            <Action.OpenInBrowser
              title="Open Changelog in Browser"
              url={changelogBrowserUrl}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          )}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open in Raycast Store"
          url={storeDeeplink}
          icon={Icon.RaycastLogoNeg}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        <Action.CopyToClipboard
          title="Copy Extension URL"
          content={item.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.OpenInBrowser title="Open in Browser" url={item.url} icon={Icon.Globe} />
      </ActionPanel.Section>

      {item.prUrl && (
        <ActionPanel.Section>
          <Action.OpenInBrowser title="View Pull Request" url={item.prUrl} icon={Icon.Code} />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <Action.OpenInBrowser title="View Author Profile" url={item.authorUrl} icon={Icon.Person} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
