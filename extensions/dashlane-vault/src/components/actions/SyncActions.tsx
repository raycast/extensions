import { Action, Icon } from "@raycast/api";

type Props = {
  onSync: () => void;
};

export const SyncAction = ({ onSync }: Props) => {
  return (
    <Action title="Sync" icon={Icon.RotateClockwise} onAction={onSync} shortcut={{ modifiers: ["cmd"], key: "s" }} />
  );
};
