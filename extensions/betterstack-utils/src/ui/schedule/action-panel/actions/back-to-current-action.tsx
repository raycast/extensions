import { Action, Icon } from "@raycast/api";

type BackToCurrentActionProps = {
  offset: number;
  onOffsetChange: (offset: number) => void;
};

export function BackToCurrentAction({ offset, onOffsetChange }: BackToCurrentActionProps) {
  if (offset === 0) return null;
  const backLabel = "Back to Today";
  return (
    <Action
      title={backLabel}
      icon={Icon.Clock}
      shortcut={{ modifiers: [], key: "t" }}
      onAction={() => onOffsetChange(0)}
    />
  );
}
