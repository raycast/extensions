import { Action, Icon, useNavigation } from "@raycast/api";
import { useFeedbinApiContext } from "../utils/FeedbinApiContext";
import { markAsRead } from "../utils/api";
import { refreshMenuBar } from "../utils/refreshMenuBar";

export interface ActionMarkAsReadProps {
  id: number;
  onAction?: () => void;
  pop?: boolean;
}

export function ActionMarkAsRead(props: ActionMarkAsReadProps) {
  const { pop } = useNavigation();
  const { unreadEntriesSet, unreadEntriesIds, unreadEntries } =
    useFeedbinApiContext();
  if (!unreadEntriesSet.has(props.id)) return null;
  return (
    <Action
      title="Mark as Read"
      icon={Icon.Check}
      onAction={async () => {
        await unreadEntries.mutate(
          unreadEntriesIds.mutate(markAsRead(props.id), {
            optimisticUpdate: (ids) => ids?.filter((id) => id !== props.id),
            shouldRevalidateAfter: false,
          }),
          {
            optimisticUpdate: (entries) =>
              entries?.filter((entry) => entry.id !== props.id),
            shouldRevalidateAfter: false,
          },
        );
        await refreshMenuBar();
        if (props.pop) {
          pop();
        }
      }}
      shortcut={{
        key: "m",
        modifiers: ["cmd"],
      }}
    />
  );
}
