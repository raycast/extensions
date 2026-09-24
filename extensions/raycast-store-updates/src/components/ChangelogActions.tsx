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
  /** The version row the user is on, so "Copy Changes" copies what they are looking at. */
  selectedVersion?: { title: string; body: string };
}

/**
 * The three copy actions every changelog panel carries, in narrowing-to-widening order:
 * the version in front of you, the newest one, then the whole file.
 *
 * Only "Copy Changes" is bound, to Common.Copy, because it is the one a version row is
 * actually about. The wider two are deliberately shortcut-free: they are rarer, and
 * inventing a second and third copy binding is how a panel collision gets built — one
 * `ray lint` would not catch, since it does not check ActionPanel collisions at all.
 */
function copyActions(changelog: string | null | undefined, selectedVersion?: { title: string; body: string }) {
  const latestChanges = changelog ? extractLatestChanges(changelog) : null;
  return (
    <>
      {selectedVersion && (
        <Action.CopyToClipboard
          title="Copy Changes"
          content={`## ${selectedVersion.title}\n\n${selectedVersion.body}`}
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      )}
      {latestChanges && (
        <Action.CopyToClipboard title="Copy Latest Changes" content={latestChanges} icon={Icon.Clipboard} />
      )}
      {changelog && <Action.CopyToClipboard title="Copy Changelog" content={changelog} icon={Icon.Document} />}
    </>
  );
}

export function ChangelogActions({ items, currentIndex, changelog, slug, selectedVersion }: ChangelogActionsProps) {
  // A deep link from the menu bar has no surrounding list, so there is nothing to
  // navigate between — but the panel must still exist, or the changelog opens with no
  // actions at all (no copy, no browser, no Store).
  const hasList = items.length > 0 && currentIndex >= 0 && currentIndex < items.length;
  if (!hasList) {
    return (
      <ActionPanel>
        {copyActions(changelog, selectedVersion)}
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
        {copyActions(changelog, selectedVersion)}
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
        {/* No shortcut. Common.Copy belongs to "Copy Changes" — the copy you reach for
            on a version row — and a second, near-synonymous copy binding is how an
            ActionPanel collision gets built. The rest stay reachable through ⌘K. */}
        <Action.CopyToClipboard title="Copy Extension URL" content={currentItem.url} icon={Icon.Clipboard} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
