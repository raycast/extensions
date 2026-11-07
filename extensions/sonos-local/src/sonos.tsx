import { Action, ActionPanel, Keyboard, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { RenameForm } from "./rename-form";
import { run } from "./run";
import {
  Group,
  GroupStatus,
  allRooms,
  changeGroupVolume,
  getGroupStatus,
  getGroups,
  getRoomVolume,
  groupAll,
  joinGroup,
  leaveGroup,
  next,
  previous,
  setRoomVolume,
  toggleGroupMute,
  togglePlay,
  volumeStep,
} from "./api";

interface Entry {
  group: Group;
  status?: GroupStatus;
}

async function load(): Promise<{ entries: Entry[]; groups: Group[] }> {
  const groups = await getGroups();
  const statuses = await Promise.all(groups.map((g) => getGroupStatus(g).catch(() => undefined)));
  return { groups, entries: groups.map((group, i) => ({ group, status: statuses[i] })) };
}

function stateIcon(status?: GroupStatus) {
  if (status?.state === "PLAYING") return { source: Icon.Play, tintColor: Color.Green };
  if (status?.state === "TRANSITIONING") return { source: Icon.CircleProgress };
  return { source: Icon.Pause, tintColor: Color.SecondaryText };
}

export default function Command() {
  const { data, isLoading, revalidate, error } = useCachedPromise(load, [], { keepPreviousData: true });
  const groups = data?.groups ?? [];
  const step = volumeStep();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rooms or tracks">
      {error && !data ? (
        <List.EmptyView icon={Icon.Warning} title="Sonos Not Reachable" description={error.message} />
      ) : null}
      {data?.entries.map(({ group, status }) => {
        const others = allRooms(groups).filter((r) => !group.members.some((m) => m.uuid === r.uuid));
        const track = status?.title ? [status.title, status.artist].filter(Boolean).join(" – ") : "Nothing loaded";
        return (
          <List.Item
            key={group.id}
            icon={status?.artUrl ? { source: status.artUrl, fallback: Icon.Music } : Icon.Speaker}
            title={group.name}
            subtitle={track}
            keywords={[...group.members.map((m) => m.name), status?.title ?? "", status?.artist ?? ""]}
            accessories={[
              group.members.length > 1 ? { tag: group.members.map((m) => m.name).join(", ") } : {},
              { icon: status?.muted ? Icon.SpeakerOff : Icon.SpeakerOn, text: String(status?.volume ?? "–") },
              { icon: stateIcon(status) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title={group.name}>
                  <Action
                    title={status?.state === "PLAYING" ? "Pause" : "Play"}
                    icon={status?.state === "PLAYING" ? Icon.Pause : Icon.Play}
                    onAction={() =>
                      run(
                        "Play/Pause",
                        async () => ((await togglePlay(group)) === "PLAYING" ? "Playing" : "Paused"),
                        revalidate,
                      )
                    }
                  />
                  <Action
                    title="Next Track"
                    icon={Icon.Forward}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={() => run("Next Track", () => next(group).then(() => undefined), revalidate)}
                  />
                  <Action
                    title="Previous Track"
                    icon={Icon.Rewind}
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    onAction={() => run("Previous Track", () => previous(group).then(() => undefined), revalidate)}
                  />
                  <Action
                    title="Raise Volume"
                    icon={Icon.SpeakerUp}
                    shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                    onAction={() =>
                      run("Raise Volume", async () => `Volume ${await changeGroupVolume(group, step)}`, revalidate)
                    }
                  />
                  <Action
                    title="Lower Volume"
                    icon={Icon.SpeakerDown}
                    shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                    onAction={() =>
                      run("Lower Volume", async () => `Volume ${await changeGroupVolume(group, -step)}`, revalidate)
                    }
                  />
                  <Action
                    title={status?.muted ? "Unmute" : "Mute"}
                    icon={status?.muted ? Icon.SpeakerOn : Icon.SpeakerOff}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                    onAction={() =>
                      run("Mute", async () => ((await toggleGroupMute(group)) ? "Muted" : "Unmuted"), revalidate)
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Group">
                  {others.length > 0 && (
                    <ActionPanel.Submenu
                      title="Add Speaker"
                      icon={Icon.PlusCircle}
                      shortcut={{ modifiers: ["cmd"], key: "g" }}
                    >
                      {others.map((room) => (
                        <Action
                          key={room.uuid}
                          title={room.name}
                          onAction={() => run(`Added ${room.name}`, () => joinGroup(room, group), revalidate)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                  {group.members.length > 1 && (
                    <ActionPanel.Submenu
                      title="Remove Speaker"
                      icon={Icon.MinusCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                    >
                      {group.members.map((room) => (
                        <Action
                          key={room.uuid}
                          title={room.name}
                          onAction={() => run(`Removed ${room.name}`, () => leaveGroup(room), revalidate)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                  {others.length > 0 && (
                    <Action
                      title="Group All Here"
                      icon={Icon.Link}
                      onAction={() => run("Grouped all speakers", () => groupAll(groups, group), revalidate)}
                    />
                  )}
                  {group.members.length > 1 && (
                    <ActionPanel.Submenu title="Room Volume" icon={Icon.SpeakerHigh}>
                      {group.members.flatMap((room) => [
                        <Action
                          key={`${room.uuid}+`}
                          title={`Raise ${room.name}`}
                          onAction={() =>
                            run(
                              `Raise ${room.name}`,
                              async () => {
                                const v = (await getRoomVolume(room)) + step;
                                await setRoomVolume(room, v);
                                return `${room.name}: ${Math.min(100, v)}`;
                              },
                              revalidate,
                            )
                          }
                        />,
                        <Action
                          key={`${room.uuid}-`}
                          title={`Lower ${room.name}`}
                          onAction={() =>
                            run(
                              `Lower ${room.name}`,
                              async () => {
                                const v = (await getRoomVolume(room)) - step;
                                await setRoomVolume(room, v);
                                return `${room.name}: ${Math.max(0, v)}`;
                              },
                              revalidate,
                            )
                          }
                        />,
                      ])}
                    </ActionPanel.Submenu>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {group.members.map((room) => (
                    <Action.Push
                      key={room.uuid}
                      title={`Rename ${room.name}`}
                      icon={Icon.Pencil}
                      target={<RenameForm room={room} onDone={revalidate} />}
                    />
                  ))}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
