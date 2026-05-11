import { List, ActionPanel, Action, Color } from "@raycast/api";
import { useState } from "react";
import { shortcuts, CATEGORIES } from "./data/shortcuts";
import type { FigmaShortcut } from "./data/shortcuts";

type Platform = "mac" | "windows";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "mac", label: "macOS" },
  { value: "windows", label: "Windows" },
];

function getKeys(shortcut: FigmaShortcut, platform: Platform): string {
  return platform === "mac" ? shortcut.mac : shortcut.windows;
}

export default function Command() {
  const defaultPlatform: Platform = process.platform === "win32" ? "windows" : "mac";
  const [platform, setPlatform] = useState<Platform>(defaultPlatform);

  const platformDropdown = (
    <List.Dropdown tooltip="Select Platform" value={platform} onChange={(v) => setPlatform(v as Platform)}>
      {PLATFORMS.map((p) => (
        <List.Dropdown.Item key={p.value} value={p.value} title={p.label} />
      ))}
    </List.Dropdown>
  );

  return (
    <List searchBarPlaceholder="Search Figma shortcuts..." searchBarAccessory={platformDropdown}>
      {CATEGORIES.map((category) => {
        const items = shortcuts.filter((s) => s.category === category);
        if (items.length === 0) return null;

        return (
          <List.Section key={category} title={category} subtitle={`${items.length} shortcuts`}>
            {items.map((shortcut) => {
              const keys = getKeys(shortcut, platform);
              return (
                <List.Item
                  key={shortcut.id}
                  title={shortcut.action}
                  keywords={shortcut.keywords}
                  accessories={[{ text: { value: keys, color: Color.SecondaryText } }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Shortcut" content={keys} />
                      <Action.CopyToClipboard
                        title="Copy Action Name"
                        content={shortcut.action}
                        shortcut={{ modifiers: ["shift"], key: "return" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
