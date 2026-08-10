import { Action, Icon } from "@raycast/api";

import { usePasswordContext } from "@/context/passwords";

export default function SyncAction() {
  const { sync } = usePasswordContext();

  return (
    <Action title="Sync" icon={Icon.RotateClockwise} onAction={sync} shortcut={{ modifiers: ["cmd"], key: "s" }} />
  );
}
