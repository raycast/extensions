import { Action, Icon } from "@raycast/api";

export function SearchHistoryActions({
  onHistoryBack,
  onHistoryForward,
}: {
  onHistoryBack: () => void;
  onHistoryForward: () => void;
}) {
  return (
    <>
      <Action
        title="Previous Search"
        icon={Icon.ArrowLeftCircle}
        shortcut={{ modifiers: ["cmd"], key: "[" }}
        onAction={onHistoryBack}
      />
      <Action
        title="Next Search"
        icon={Icon.ArrowRightCircle}
        shortcut={{ modifiers: ["cmd"], key: "]" }}
        onAction={onHistoryForward}
      />
    </>
  );
}
