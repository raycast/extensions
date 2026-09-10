import { Action, Icon, Keyboard } from "@raycast/api";

/** Parent navigation is available on both empty and populated lists. */
export function NavigationActions({ onUp }: { onUp?: () => void }) {
  if (!onUp) return null;
  return (
    <Action
      title="Go to Parent Folder"
      icon={Icon.ChevronLeft}
      shortcut={Keyboard.Shortcut.Common.MoveUp}
      onAction={onUp}
    />
  );
}
