import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { PinnedFunctions } from "../hooks";

export type PinActionsSectionProps = {
  item: string;
  isPinned: boolean;
  pinnedFunctions: PinnedFunctions;
};

export function PinActionsSection({ item, isPinned, pinnedFunctions }: PinActionsSectionProps) {
  const allowedMovements = isPinned ? pinnedFunctions.getAllowedMovements(item) : [];

  return (
    <ActionPanel.Section>
      <Action
        title={isPinned ? "Unpin" : "Pin"}
        icon={isPinned ? Icon.PinDisabled : Icon.Pin}
        onAction={() => pinnedFunctions.togglePin(item)}
        shortcut={Keyboard.Shortcut.Common.Pin}
      />

      {isPinned && allowedMovements.length > 0 && (
        <>
          {allowedMovements.includes("up") && (
            <Action
              /* eslint-disable-next-line @raycast/prefer-title-case */
              title="Move Up in Pinned"
              icon={Icon.ArrowUp}
              onAction={() => pinnedFunctions.move(item, "up")}
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
            />
          )}
          {allowedMovements.includes("down") && (
            <Action
              title="Move Down in Pinned"
              icon={Icon.ArrowDown}
              onAction={() => pinnedFunctions.move(item, "down")}
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
            />
          )}
          {allowedMovements.includes("top") && (
            <Action
              title="Move to Top of Pinned"
              icon={Icon.ArrowUpCircle}
              onAction={() => pinnedFunctions.move(item, "top")}
              shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "arrowUp" }}
            />
          )}
          {allowedMovements.includes("bottom") && (
            <Action
              title="Move to Bottom of Pinned"
              icon={Icon.ArrowDownCircle}
              onAction={() => pinnedFunctions.move(item, "bottom")}
              shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "arrowDown" }}
            />
          )}
        </>
      )}
    </ActionPanel.Section>
  );
}
