import { Action, Icon } from "@raycast/api";
import { useFeedbinApiContext } from "../utils/FeedbinApiContext";
import { deleteStarredEntries, starEntries } from "../utils/api";

export interface ActionStarToggleProps {
  id: number;
}

export function ActionStarToggle(props: ActionStarToggleProps) {
  const { starredEntriesIds, starredEntriesIdsSet } = useFeedbinApiContext();
  return starredEntriesIdsSet.has(props.id) ? (
    <Action
      title="Unstar This Content"
      icon={Icon.StarDisabled}
      onAction={async () => {
        starredEntriesIds.mutate(deleteStarredEntries(props.id), {
          shouldRevalidateAfter: false,
          optimisticUpdate: (ids) => ids?.filter((id) => id !== props.id),
        });
      }}
      shortcut={{
        key: "s",
        modifiers: ["cmd"],
      }}
    />
  ) : (
    <Action
      title="Star This Content"
      icon={Icon.Star}
      onAction={async () => {
        starredEntriesIds.mutate(starEntries(props.id), {
          optimisticUpdate: (ids) => [...(ids ?? []), props.id],
          shouldRevalidateAfter: false,
        });
      }}
      shortcut={{
        key: "s",
        modifiers: ["cmd"],
      }}
    />
  );
}
