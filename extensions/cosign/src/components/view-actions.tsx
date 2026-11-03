import { Action, ActionPanel, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

/** Shared across every list in the extension, so one choice applies everywhere. */
export function useDescriptionOnly() {
  const [descriptionOnly, setDescriptionOnly] = useCachedState("description-only", false);
  return { descriptionOnly, toggleDescriptionOnly: () => setDescriptionOnly((v) => !v) };
}

/** The "View" action section: Show/Hide Sidebar (⇧⌘D) and Show/Hide Description (⇧⌘Y). */
export function ViewSection(props: {
  descriptionOnly: boolean;
  onToggleDescription: () => void;
  /** Omit when the list has no sidebar to collapse. */
  sidebar?: { shown: boolean; onToggle: () => void };
}) {
  return (
    <ActionPanel.Section title="View">
      {props.sidebar ? (
        <Action
          title={props.sidebar.shown ? "Hide Sidebar" : "Show Sidebar"}
          icon={Icon.AppWindowSidebarRight}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            Windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
          onAction={props.sidebar.onToggle}
        />
      ) : null}
      <Action
        title={props.descriptionOnly ? "Hide Description" : "Show Description"}
        icon={Icon.AlignLeft}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "y" },
          Windows: { modifiers: ["ctrl", "shift"], key: "y" },
        }}
        onAction={props.onToggleDescription}
      />
    </ActionPanel.Section>
  );
}
