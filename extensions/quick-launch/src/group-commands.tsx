import { useEffect, useMemo, useState } from "react";
import { Grid, Icon, getPreferenceValues } from "@raycast/api";

import { GroupGrid } from "./group-grid";
import { loadGroups } from "./storage";
import { AppGroup } from "./types";

function normalizeGroupName(value: string): string {
  return value.trim().toLowerCase();
}

export function findGroupByName(groups: AppGroup[], name: string): AppGroup | undefined {
  const normalizedName = normalizeGroupName(name);
  if (!normalizedName) return undefined;
  return groups.find((group) => normalizeGroupName(group.name) === normalizedName);
}

export function OpenGroupSlotCommand(props: { slotTitle: string }) {
  const groups = useLoadedGroups();
  const preferences = getPreferenceValues<{ groupName?: string }>();
  const configuredName = preferences.groupName?.trim() ?? "";
  const group = useMemo(() => findGroupByName(groups, configuredName), [groups, configuredName]);

  if (!configuredName) {
    return (
      <Grid navigationTitle={props.slotTitle} searchBarPlaceholder="Search apps">
        <Grid.EmptyView
          title={`${props.slotTitle} is not configured`}
          description="Set the Group Name preference for this command in Raycast, then assign a hotkey to it."
          icon={Icon.Gear}
        />
      </Grid>
    );
  }

  if (!group) {
    return (
      <Grid navigationTitle={props.slotTitle} searchBarPlaceholder="Search apps">
        <Grid.EmptyView
          title="Configured group not found"
          description={`No group named \"${configuredName}\" exists right now. Update the command preference or recreate the group in Launch Manager.`}
          icon={Icon.ExclamationMark}
        />
      </Grid>
    );
  }

  return (
    <GroupGrid
      groupId={group.id}
      title={group.name}
      emptyMessage={`The group \"${configuredName}\" is no longer available. Update the command preference in Raycast.`}
    />
  );
}

function useLoadedGroups() {
  const [groups, setGroups] = useState<AppGroup[]>([]);

  useEffect(() => {
    void loadGroups().then(setGroups);
  }, []);

  return groups;
}
