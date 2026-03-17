import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { CATEGORIES, Platform, shortcuts } from "./shortcuts";

const PLATFORM_KEY = "preferred-platform";
const PLATFORMS: Platform[] = ["macOS", "Windows", "Linux"];

export default function Command() {
  const [platform, setPlatform] = useState<Platform>("macOS");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<string>(PLATFORM_KEY).then((stored) => {
      if (stored && PLATFORMS.includes(stored as Platform)) {
        setPlatform(stored as Platform);
      }
      setIsLoading(false);
    });
  }, []);

  async function changePlatform(next: Platform) {
    setPlatform(next);
    await LocalStorage.setItem(PLATFORM_KEY, next);
  }

  const platformActions = PLATFORMS.filter((p) => p !== platform).map((p) => (
    <Action
      key={p}
      title={`Switch to ${p}`}
      icon={Icon.Desktop}
      onAction={() => changePlatform(p)}
      shortcut={
        p === "macOS"
          ? { modifiers: ["cmd", "shift"], key: "1" }
          : p === "Windows"
          ? { modifiers: ["cmd", "shift"], key: "2" }
          : { modifiers: ["cmd", "shift"], key: "3" }
      }
    />
  ));

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Figma Shortcuts"
      searchBarPlaceholder="Search shortcuts…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Platform"
          value={platform}
          onChange={(val) => changePlatform(val as Platform)}
        >
          {PLATFORMS.map((p) => (
            <List.Dropdown.Item key={p} title={p} value={p} />
          ))}
        </List.Dropdown>
      }
    >
      {CATEGORIES.map((category) => {
        const items = shortcuts.filter((s) => s.category === category);
        if (items.length === 0) return null;
        return (
          <List.Section key={category} title={category}>
            {items.map((shortcut) => {
              const keys = shortcut.keys[platform];
              return (
                <List.Item
                  key={`${category}-${shortcut.title}`}
                  title={shortcut.title}
                  subtitle={keys}
                  accessories={[{ text: keys }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Shortcut"
                        content={keys}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <ActionPanel.Section title="Platform">
                        {platformActions}
                      </ActionPanel.Section>
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
