import { Action, ActionPanel, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useRef } from "react";
import { actions, ActionID } from "./lib/actions";
import { accessibilitySettings, runAction, website } from "./lib/screenflare";

export default function Screenflare() {
  const { value: pinnedIds = [], setValue: setPinnedIds, isLoading } = useLocalStorage<string[]>("pinned-actions", []);
  const saving = useRef(false);
  const pinned = new Set(pinnedIds);
  const pinnedActions = [...pinned].flatMap((id) => actions.filter((action) => action.id === id));
  const sections = [
    { title: "Pinned", items: pinnedActions },
    ...["Capture", "Recording", "Library & Settings"].map((group) => ({
      title: group,
      items: actions.filter((action) => action.group === group && !pinned.has(action.id)),
    })),
  ];

  async function togglePin(id: ActionID) {
    if (isLoading || saving.current) return;
    saving.current = true;
    try {
      await setPinnedIds(pinned.has(id) ? pinnedIds.filter((item) => item !== id) : [...pinnedIds, id]);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Pinned Actions",
        message: "Please try again.",
      });
    } finally {
      saving.current = false;
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search captures, recording controls, history…">
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Matching Actions"
        description="Try “area”, “OCR”, “recording”, or “history”."
      />
      {sections
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <List.Section key={section.title} title={section.title}>
            {section.items.map((action) => (
              <List.Item
                key={action.id}
                id={action.id}
                title={action.title}
                subtitle={action.description}
                icon={Icon[action.icon]}
                keywords={[...action.keywords]}
                accessories={pinned.has(action.id) ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []}
                actions={
                  <ActionPanel>
                    <Action title={action.title} icon={Icon[action.icon]} onAction={() => runAction(action.id)} />
                    <Action
                      title={pinned.has(action.id) ? "Unpin Action" : "Pin Action"}
                      icon={pinned.has(action.id) ? Icon.PinDisabled : Icon.Pin}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => togglePin(action.id)}
                    />
                    <ActionPanel.Section title="Help & Setup">
                      <Action.OpenInBrowser
                        title="Screenflare User Guide"
                        url={`${website}/docs`}
                        shortcut={{ modifiers: ["cmd"], key: "/" }}
                      />
                      <Action.OpenInBrowser title="Accessibility Settings" url={accessibilitySettings} />
                      <Action title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
