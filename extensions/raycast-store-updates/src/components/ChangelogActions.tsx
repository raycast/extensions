import { ActionPanel, Action, Icon, Keyboard, useNavigation } from "@raycast/api";
import { StoreItem } from "../types";
import { createStoreDeeplink, extractLatestChanges } from "../utils";
import { ChangelogDetail } from "./ChangelogDetail";

interface ChangelogActionsProps {
  items: StoreItem[];
  currentIndex: number;
  changelog?: string | null;
}

export function ChangelogActions({ items, currentIndex, changelog }: ChangelogActionsProps) {
  const { pop } = useNavigation();

  if (!items.length || currentIndex < 0 || currentIndex >= items.length) {
    return null;
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
          <Action
            title="Previous Changelog"
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            onAction={pop}
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
        <Action.CopyToClipboard
          title="Copy Extension URL"
          content={currentItem.url}
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
