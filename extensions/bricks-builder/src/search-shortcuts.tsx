import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, LaunchType, List } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useState } from "react";
import { formatShortcut, isPressable, KeyStyle } from "./keys";
import { pressShortcut } from "./lib/press";
import { CATEGORIES, Category, SHORTCUTS } from "./shortcuts";

const DOCS_URL = "https://academy.bricksbuilder.io/builder/interface/keyboard-shortcuts/";
const IS_MAC = process.platform === "darwin";

function resolveKeyStyle(): KeyStyle {
  const { keyStyle } = getPreferenceValues<Preferences.SearchShortcuts>();
  if (keyStyle === "mac" || keyStyle === "windows") return keyStyle;
  return IS_MAC ? "mac" : "windows";
}

export default function Command() {
  const keyStyle = resolveKeyStyle();
  const otherStyle: KeyStyle = keyStyle === "mac" ? "windows" : "mac";
  const [category, setCategory] = useState<Category | "all">("all");

  const categories = category === "all" ? CATEGORIES : [category];

  return (
    <List
      searchBarPlaceholder="Search Bricks shortcuts…"
      searchBarAccessory={
        <List.Dropdown tooltip="Category" onChange={(value) => setCategory(value as Category | "all")} storeValue>
          <List.Dropdown.Item title="All Categories" value="all" />
          {CATEGORIES.map((c) => (
            <List.Dropdown.Item key={c} title={c} value={c} />
          ))}
        </List.Dropdown>
      }
    >
      {categories.map((c) => (
        <List.Section key={c} title={c}>
          {SHORTCUTS.filter((s) => s.category === c).map((shortcut) => {
            const label = formatShortcut(shortcut, keyStyle);
            const otherLabel = formatShortcut(shortcut, otherStyle);
            const canPress = IS_MAC && isPressable(shortcut);

            return (
              <List.Item
                key={shortcut.id}
                title={shortcut.title}
                subtitle={shortcut.note}
                keywords={[label, otherLabel, c, ...(shortcut.keywords ?? [])]}
                accessories={[{ tag: label, tooltip: `${otherStyle === "mac" ? "Mac" : "Windows"}: ${otherLabel}` }]}
                actions={
                  <ActionPanel>
                    {canPress && (
                      <Action
                        title="Press in Builder"
                        icon={Icon.Keyboard}
                        onAction={() => pressShortcut(shortcut, label)}
                      />
                    )}
                    {canPress && (
                      <Action.CreateQuicklink
                        title="Create Hotkey Quicklink"
                        icon={Icon.Link}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                        quicklink={{
                          name: `Bricks: ${shortcut.title}`,
                          link: createDeeplink({
                            command: "press-shortcut",
                            launchType: LaunchType.Background,
                            arguments: { shortcut: shortcut.id },
                          }),
                        }}
                      />
                    )}
                    <Action.CopyToClipboard title="Copy Shortcut" content={label} />
                    <Action.CopyToClipboard
                      title={`Copy ${otherStyle === "mac" ? "Mac" : "Windows"} Shortcut`}
                      content={otherLabel}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.OpenInBrowser
                      title="Open Bricks Docs"
                      url={DOCS_URL}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
