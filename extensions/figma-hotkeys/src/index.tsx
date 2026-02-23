import { Action, ActionPanel, Clipboard, List, open } from "@raycast/api";
import { getHotkeysByCategory, type FigmaHotkey } from "./hotkeys";

const FIGMA_SHORTCUTS_URL =
  "https://help.figma.com/hc/en-us/articles/360040328653";

export default function Command() {
  const byCategory = getHotkeysByCategory();

  return (
    <List
      searchBarPlaceholder="Search Figma shortcuts…"
      navigationTitle="Figma Hotkeys"
      filtering={{ keepSectionOrder: true }}
    >
      {Array.from(byCategory.entries()).map(([category, hotkeys]) => {
        if (hotkeys.length === 0) return null;
        return (
          <List.Section key={category} title={category}>
            {hotkeys.map((item) => (
              <HotkeyItem key={item.id} item={item} />
            ))}
          </List.Section>
        );
      })}
      <List.Section title="Help">
        <List.Item
          title="Open Figma keyboard shortcuts help"
          subtitle={FIGMA_SHORTCUTS_URL}
          accessories={[{ text: "Browser" }]}
          keywords={["help", "docs", "official"]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Browser"
                onAction={() => open(FIGMA_SHORTCUTS_URL)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function HotkeyItem({ item }: { item: FigmaHotkey }) {
  const keywords = [item.winShortcut, item.macShortcut, item.category].filter(
    Boolean,
  ) as string[];

  return (
    <List.Item
      title={item.action}
      accessories={[{ text: item.winShortcut }]}
      keywords={keywords}
      actions={
        <ActionPanel>
          <Action
            title="Copy Shortcut"
            onAction={() => Clipboard.copy(item.winShortcut)}
          />
          {item.macShortcut && item.macShortcut !== item.winShortcut && (
            <Action
              title="Copy Mac Shortcut"
              onAction={() => Clipboard.copy(item.macShortcut ?? "")}
            />
          )}
          <Action
            title="Open Shortcuts Help"
            onAction={() => open(FIGMA_SHORTCUTS_URL)}
          />
        </ActionPanel>
      }
    />
  );
}
