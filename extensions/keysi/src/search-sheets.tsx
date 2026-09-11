import { useMemo } from "react";
import { Action, ActionPanel, Icon, List, showToast, Toast, Clipboard, Keyboard } from "@raycast/api";
import { flatten, loadSheets, type Shortcut } from "./lib/sheets";
import { readTier } from "./lib/tier";
import { Locked } from "./lib/locked";
import { showShortcuts } from "./lib/keysi";

/**
 * Search across every cheat sheet — the bundled Vim, tmux, Figma and Slack
 * ones, plus anything the user wrote.
 *
 * Reads the sheet JSON straight off disk rather than asking the app. Those
 * files are the source of truth, they are static, and they are the half of
 * Keysi that does *not* need the Accessibility API — so this command works
 * with Keysi closed, which is the whole reason it is worth having in a
 * launcher. Anything about the frontmost app's live menus goes through the
 * URL scheme instead, because only the app can read those.
 */
export default function Command() {
  // Read before anything else. This command is the one that never talks to
  // Keysi — it reads sheet JSON straight off disk — so the file is the only
  // place it can learn whether the integrations are paid for.
  const tier = useMemo(() => readTier(), []);
  const shortcuts = useMemo(() => (tier.unlocked ? flatten(loadSheets()) : []), [tier.unlocked]);

  if (!tier.unlocked) {
    return <Locked status={tier} />;
  }

  if (shortcuts.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No cheat sheets found"
          description="Keysi ships sheets for Vim, tmux, Figma and Slack. If it's installed somewhere other than Applications, this command can't see them."
        />
      </List>
    );
  }

  // Grouped by sheet so the list reads as "Vim … tmux …" rather than one
  // undifferentiated wall, and so a search for "split" makes it obvious
  // which tool each hit belongs to.
  const bySheet = new Map<string, Shortcut[]>();
  for (const shortcut of shortcuts) {
    const existing = bySheet.get(shortcut.sheetName);
    if (existing) existing.push(shortcut);
    else bySheet.set(shortcut.sheetName, [shortcut]);
  }

  return (
    <List searchBarPlaceholder="Search every cheat sheet…">
      {[...bySheet.entries()].map(([sheetName, rows]) => (
        <List.Section key={sheetName} title={sheetName} subtitle={`${rows.length}`}>
          {rows.map((shortcut) => (
            <List.Item
              key={shortcut.id}
              title={shortcut.title}
              subtitle={shortcut.group}
              // The keys are the answer, so they get the accessory rather
              // than being buried in a detail pane nobody opens.
              accessories={shortcut.keys ? [{ tag: shortcut.keys }] : []}
              // Raycast only matches on title by default; without this,
              // searching "tmux" or the group name finds nothing.
              keywords={[shortcut.sheetName, shortcut.group, ...shortcut.title.split(/\s+/)]}
              actions={
                <ActionPanel>
                  {shortcut.keys ? (
                    <Action
                      title="Copy Keys"
                      icon={Icon.Clipboard}
                      onAction={async () => {
                        await Clipboard.copy(shortcut.keys);
                        await showToast({ style: Toast.Style.Success, title: `Copied ${shortcut.keys}` });
                      }}
                    />
                  ) : null}
                  <Action title="Open in Keysi" icon={Icon.AppWindow} onAction={() => showShortcuts(shortcut.title)} />
                  <Action.CopyToClipboard
                    title="Copy Command Name"
                    content={shortcut.title}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
