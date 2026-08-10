import { Action, Icon } from "@raycast/api";

import { useNotesContext } from "@/context/notes";

export default function SyncAction() {
  const { sync } = useNotesContext();

  return (
    <Action title="Sync" icon={Icon.RotateClockwise} onAction={sync} shortcut={{ modifiers: ["cmd"], key: "s" }} />
  );
}
