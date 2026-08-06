import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { StoreItem } from "../types";
import { changelogUrl, createStoreDeeplink, extractLatestChanges } from "../utils";
import { ChangelogDetail } from "./ChangelogDetail";

interface ChangelogActionsProps {
  items: StoreItem[];
  currentIndex: number;
  changelog?: string | null;
  /** Set when opened via deep link, where there is no surrounding list to derive it from. */
  slug?: string;
}

export function ChangelogActions({ items, currentIndex, changelog, slug }: ChangelogActionsProps) {
  // A deep link from the menu bar has no surrounding list, so there is nothing to
  // navigate between — but the panel must still exist, or the changelog opens with no
  // actions at all (no copy, no browser, no Store).
  const hasList = items.length > 0 && currentIndex >= 0 && currentIndex < items.length;
  if (!hasList) {
    const latest = changelog ? extractLatestChanges(changelog) : null;
    return (
      <ActionPanel>
        {latest && (
          <Action.CopyToClipboard
            title="Copy Recent Changes"
            content={latest}
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
        {slug && (
          <Action.OpenInBrowser
            title="Open Changelog in Browser"
            url={changelogUrl(slug)}
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        )}
      </ActionPanel>
    );
  }
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const previousItem = hasPrevious ? items[currentIndex - 1] : null;
  const nextItem = hasNext ? items[currentIndex + 1] : null;

  const currentItem = items[currentIndex];
  const latestChanges = changelog ? extractLatestChanges(changelog) : null;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Navigation">
        {nextItem && nextItem.extensionSlug && (
          <Action.Push
            title="Next Changelog"
            icon={Icon.ArrowDown}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            target={
              <ChangelogDetail
                slug={nextItem.extensionSlug}
                title={nextItem.title}
                items={items}
                currentIndex={currentIndex + 1}
              />
            }
          />
        )}
        {previousItem && previousItem.extensionSlug && (
          <Action.Push
            title="Previous Changelog"
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            target={
              <ChangelogDetail
                slug={previousItem.extensionSlug}
                title={previousItem.title}
                items={items}
                currentIndex={currentIndex - 1}
              />
            }
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        {latestChanges && (
          <Action.CopyToClipboard
            title="Copy Recent Changes"
            content={latestChanges}
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
        <Action.OpenInBrowser
          title="Open in Browser"
          url={currentItem.url}
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open in Raycast Store"
          url={createStoreDeeplink(currentItem.url)}
          icon={Icon.RaycastLogoNeg}
        />
        {/* CopyName — cmd+shift+c IS Common.Copy, already used by "Copy Recent Changes" above. */}
        <Action.CopyToClipboard
          title="Copy Extension URL"
          content={currentItem.url}
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
