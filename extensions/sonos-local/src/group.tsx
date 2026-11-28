import { Action, ActionPanel, Keyboard, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { run } from "./run";
import { allRooms, getActiveGroup, groupAll, joinGroup, leaveGroup } from "./api";

export default function Command() {
  const { data, isLoading, revalidate, error } = useCachedPromise(() => getActiveGroup(), [], {
    keepPreviousData: true,
  });
  const active = data?.group;
  const groups = data?.groups ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={active ? `Active Group: ${active.name}` : "Group Sonos Speakers"}
      searchBarPlaceholder="Search rooms"
    >
      {error && !data ? (
        <List.EmptyView icon={Icon.Warning} title="Sonos Not Reachable" description={error.message} />
      ) : null}
      {active &&
        allRooms(groups).map((room) => {
          const inActive = active.members.some((m) => m.uuid === room.uuid);
          const current = groups.find((g) => g.members.some((m) => m.uuid === room.uuid));
          return (
            <List.Item
              key={room.uuid}
              icon={inActive ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
              title={room.name}
              subtitle={current && current.members.length > 1 ? `in ${current.name}` : "alone"}
              accessories={room.uuid === active.coordinator.uuid ? [{ tag: "Coordinator" }] : []}
              actions={
                <ActionPanel>
                  {inActive ? (
                    <Action
                      title={`Remove from ${active.name}`}
                      icon={Icon.MinusCircle}
                      onAction={() => run(`Removed ${room.name}`, () => leaveGroup(room), revalidate)}
                    />
                  ) : (
                    <Action
                      title={`Add to ${active.name}`}
                      icon={Icon.PlusCircle}
                      onAction={() => run(`Added ${room.name}`, () => joinGroup(room, active), revalidate)}
                    />
                  )}
                  <Action
                    title="Group All"
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() => run("Grouped all speakers", () => groupAll(groups, active), revalidate)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
