import { Action, Icon, Keyboard } from "@raycast/api";

export function NavigationActions({
  onUp,
  onReturnToStart,
}: {
  onUp?: () => void;
  onReturnToStart?: () => void;
}) {
  return (
    <>
      {onUp && (
        <Action
          title="Go to Parent Folder"
          icon={Icon.ChevronLeft}
          shortcut={Keyboard.Shortcut.Common.MoveUp}
          onAction={onUp}
        />
      )}
      {onReturnToStart && (
        <Action
          title="Return to Start"
          icon={Icon.House}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          onAction={onReturnToStart}
        />
      )}
    </>
  );
}
