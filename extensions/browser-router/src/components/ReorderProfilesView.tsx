import { ActionPanel, Action, Icon, Image, List, showToast, Toast, Color, Keyboard } from "@raycast/api";
import { useState } from "react";
import { BrowserProfile } from "../types";
import { setCustomProfileOrder, setSortMode } from "../utils/storage";

interface ReorderProfilesViewProps {
  initialProfiles: BrowserProfile[];
  onOrderChanged: (newOrderIds: string[], newMode?: "alphabetical" | "custom") => void;
}

export function ReorderProfilesView({ initialProfiles, onOrderChanged }: ReorderProfilesViewProps) {
  const [profiles, setProfiles] = useState<BrowserProfile[]>(initialProfiles);

  function getProfileIcon(profile: BrowserProfile): Image.ImageLike {
    if (profile.avatarPath) {
      return { source: profile.avatarPath };
    }
    if (profile.iconPath) {
      return { source: profile.iconPath };
    }
    return { source: profile.fallbackIcon };
  }

  async function persistOrder(updatedList: BrowserProfile[], actionTitle: string) {
    setProfiles(updatedList);
    const newIds = updatedList.map((p) => p.id);
    await setCustomProfileOrder(newIds);
    await setSortMode("custom");
    onOrderChanged(newIds);
    await showToast({
      style: Toast.Style.Success,
      title: actionTitle,
    });
  }

  async function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...profiles];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    await persistOrder(next, `Moved ${temp.displayName} up to #${index}`);
  }

  async function moveDown(index: number) {
    if (index >= profiles.length - 1) return;
    const next = [...profiles];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    await persistOrder(next, `Moved ${temp.displayName} down to #${index + 2}`);
  }

  async function moveToTop(index: number) {
    if (index <= 0) return;
    const next = [...profiles];
    const [target] = next.splice(index, 1);
    next.unshift(target);
    await persistOrder(next, `Pinned ${target.displayName} to #1`);
  }

  async function moveToBottom(index: number) {
    if (index >= profiles.length - 1) return;
    const next = [...profiles];
    const [target] = next.splice(index, 1);
    next.push(target);
    await persistOrder(next, `Moved ${target.displayName} to bottom`);
  }

  async function resetAlphabetical() {
    const next = [...profiles].sort((a, b) => {
      const browserCmp = a.browserName.localeCompare(b.browserName, undefined, { sensitivity: "base" });
      if (browserCmp !== 0) return browserCmp;
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
    });
    setProfiles(next);
    await setCustomProfileOrder([]);
    await setSortMode("alphabetical");
    onOrderChanged([], "alphabetical");
    await showToast({
      style: Toast.Style.Success,
      title: "Reset to Alphabetical Order",
    });
  }

  return (
    <List searchBarPlaceholder="Filter profiles to reorder...">
      <List.Section
        title="Custom Profile Order"
        subtitle="Use Alt+Up / Alt+Down or Action menu to arrange your preferred order"
      >
        {profiles.map((profile, idx) => {
          const rank = idx + 1;
          const isFirst = idx === 0;
          const isLast = idx === profiles.length - 1;

          return (
            <List.Item
              key={profile.id}
              icon={getProfileIcon(profile)}
              title={profile.displayName}
              subtitle={profile.browserName !== profile.displayName ? profile.browserName : undefined}
              accessories={[
                {
                  tag: {
                    value: `#${rank}`,
                    color: rank === 1 ? Color.Green : rank <= 3 ? Color.Blue : Color.SecondaryText,
                  },
                },
                {
                  text: `Profile: ${profile.profileDirectory}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Reorder Position">
                    {!isFirst ? (
                      <Action
                        title="Move up"
                        icon={Icon.ArrowUp}
                        shortcut={{ modifiers: ["opt"], key: "arrowUp" }}
                        onAction={() => moveUp(idx)}
                      />
                    ) : null}
                    {!isLast ? (
                      <Action
                        title="Move Down"
                        icon={Icon.ArrowDown}
                        shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
                        onAction={() => moveDown(idx)}
                      />
                    ) : null}
                    {!isFirst ? (
                      <Action
                        title="Pin / Move to Top (#1)"
                        icon={Icon.ArrowUpCircle}
                        shortcut={Keyboard.Shortcut.Common.MoveUp}
                        onAction={() => moveToTop(idx)}
                      />
                    ) : null}
                    {!isLast ? (
                      <Action
                        title="Move to Bottom"
                        icon={Icon.ArrowDownCircle}
                        shortcut={Keyboard.Shortcut.Common.MoveDown}
                        onAction={() => moveToBottom(idx)}
                      />
                    ) : null}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Reset Layout">
                    <Action
                      title="Reset to Alphabetical Order"
                      icon={Icon.RotateAntiClockwise}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                      onAction={resetAlphabetical}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
