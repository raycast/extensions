import { Action, ActionPanel, Icon } from "@raycast/api";
import { ReactNode } from "react";
import { shortcuts } from "../data/shortcuts";
import { MoveDirection } from "../types";

export interface PinProps {
  isPinned: boolean;
  onTogglePin: () => void;
  /** Only set for items rendered in the "Pinned" section. */
  moveDirections?: { up: boolean; down: boolean };
  onMove?: (direction: MoveDirection) => void;
}

/** Action section with Pin/Unpin and Move Up/Down, after any extra `children` actions. */
export default function PinActionsSection(props: PinProps & { children?: ReactNode }) {
  const { isPinned, onTogglePin, moveDirections, onMove, children } = props;

  return (
    <ActionPanel.Section>
      {children}
      <Action
        title={!isPinned ? "Pin" : "Unpin"}
        icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
        shortcut={shortcuts.pin}
        onAction={onTogglePin}
      />
      {isPinned && onMove && (
        <>
          {moveDirections?.up && (
            <Action
              title="Move up in Pinned"
              icon={Icon.ArrowUp}
              shortcut={shortcuts.moveUp}
              onAction={() => onMove("up")}
            />
          )}
          {moveDirections?.down && (
            <Action
              title="Move Down in Pinned"
              icon={Icon.ArrowDown}
              shortcut={shortcuts.moveDown}
              onAction={() => onMove("down")}
            />
          )}
        </>
      )}
    </ActionPanel.Section>
  );
}
