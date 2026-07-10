import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Color,
  useNavigation,
} from "@raycast/api";
import { withAccessToken, getAccessToken, usePromise } from "@raycast/utils";
import { google } from "./google";
import {
  Room,
  loadOrSeedRooms,
  getCachedUserEmail,
  clearRooms,
} from "./roomStore";
import Onboarding from "./onboarding";
import ManageRooms from "./manageRooms";

/** How far ahead we look for the next busy block. */
const WINDOW_MINUTES = 240;
/** Fallback group name for rooms with no known floor (manual/scan-added
 * rooms don't have this metadata — only the Directory API provides it). */
const UNKNOWN_FLOOR = "Rooms";

type RoomStatus = Room & {
  occupied: boolean;
  /** If occupied: minutes until free. If free: minutes until next busy
   * block (or WINDOW_MINUTES if none found — see beyondWindow). */
  minutes: number;
  /** True if this number is an estimate capped by the search window rather
   * than an actual event boundary — the real value could be bigger. */
  beyondWindow: boolean;
};

function floorNumber(floor: string): number {
  const match = floor.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function fetchRoomStatuses(rooms: Room[]): Promise<RoomStatus[]> {
  const { token } = getAccessToken();
  const now = new Date();
  const nowMs = now.getTime();
  const windowEndMs = nowMs + WINDOW_MINUTES * 60 * 1000;

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: now.toISOString(),
      timeMax: new Date(windowEndMs).toISOString(),
      items: rooms.map((room) => ({ id: room.calendarId })),
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }

  const data = JSON.parse(body) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };

  return rooms.map((room) => {
    const busy = (data.calendars?.[room.calendarId]?.busy ?? [])
      .map((b) => ({
        start: new Date(b.start).getTime(),
        end: new Date(b.end).getTime(),
      }))
      .sort((a, b) => a.start - b.start);

    const currentIndex = busy.findIndex(
      (b) => b.start <= nowMs && nowMs < b.end,
    );

    if (currentIndex !== -1) {
      let mergedEnd = busy[currentIndex].end;
      for (
        let i = currentIndex + 1;
        i < busy.length && busy[i].start <= mergedEnd;
        i++
      ) {
        mergedEnd = Math.max(mergedEnd, busy[i].end);
      }
      const cappedAtWindow = mergedEnd >= windowEndMs;
      const minutes = Math.round(
        ((cappedAtWindow ? windowEndMs : mergedEnd) - nowMs) / 60000,
      );
      return { ...room, occupied: true, minutes, beyondWindow: cappedAtWindow };
    }

    const nextBlock = busy.find((b) => b.start > nowMs);
    if (nextBlock) {
      return {
        ...room,
        occupied: false,
        minutes: Math.round((nextBlock.start - nowMs) / 60000),
        beyondWindow: false,
      };
    }

    return {
      ...room,
      occupied: false,
      minutes: WINDOW_MINUTES,
      beyondWindow: true,
    };
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m === 0 ? `${h}h` : `${h}h ${m}m`;
  return `${m} min`;
}

function statusLabel(room: RoomStatus): string {
  const duration = formatDuration(room.minutes);
  const suffix = room.beyondWindow ? "+" : "";
  return room.occupied
    ? `Occupied for ${duration}${suffix}`
    : `${duration}${suffix} free`;
}

function statusColor(room: RoomStatus): Color {
  if (room.occupied) return Color.SecondaryText;
  if (room.minutes < 15) return Color.Red;
  if (room.minutes < 30) return Color.Orange;
  return Color.Green;
}

function roomSubtitle(room: Room): string {
  const parts: string[] = [];
  if (room.capacity) parts.push(`seats ${room.capacity}`);
  if (room.equipment && room.equipment.length > 0)
    parts.push(room.equipment.join(", "));
  return parts.join(" · ");
}

function RoomList({
  rooms,
  onRoomsChanged,
}: {
  rooms: Room[];
  onRoomsChanged: () => void;
}) {
  const {
    data: statuses,
    isLoading,
    revalidate,
  } = usePromise(fetchRoomStatuses, [rooms]);
  const { push } = useNavigation();

  async function handleBlock(room: RoomStatus, minutes: number) {
    if (room.occupied) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Room is occupied right now",
      });
      return;
    }
    if (!room.beyondWindow && minutes > room.minutes) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Can't block that long",
        message: `${room.name} is only free for ${formatDuration(room.minutes)}`,
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Blocking ${room.name}...`,
    });

    try {
      const { token } = getAccessToken();
      const start = new Date();
      const end = new Date(start.getTime() + minutes * 60 * 1000);

      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: "Room Block",
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            attendees: [{ email: room.calendarId, resource: true }],
          }),
        },
      );

      const body = await res.text();
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}: ${body}`);
      }

      toast.style = Toast.Style.Success;
      toast.title = `Blocked ${room.name} for ${minutes} min`;
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't block room";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleResetRoomSetup() {
    await clearRooms();
    onRoomsChanged();
  }

  const groupedByFloor = new Map<string, RoomStatus[]>();
  for (const room of statuses ?? []) {
    const key = room.floor ?? UNKNOWN_FLOOR;
    const list = groupedByFloor.get(key) ?? [];
    list.push(room);
    groupedByFloor.set(key, list);
  }
  // Free rooms first, occupied rooms after — stable sort keeps each group's
  // original order intact.
  for (const list of groupedByFloor.values()) {
    list.sort((a, b) => Number(a.occupied) - Number(b.occupied));
  }
  const floorsDescending = Array.from(groupedByFloor.keys()).sort(
    (a, b) => floorNumber(b) - floorNumber(a),
  );

  return (
    <List searchBarPlaceholder="Filter rooms..." isLoading={isLoading}>
      {floorsDescending.map((floor) => (
        <List.Section key={floor} title={floor}>
          {groupedByFloor.get(floor)!.map((room) => (
            <List.Item
              key={room.id}
              icon={Icon.Livestream}
              title={room.name}
              subtitle={roomSubtitle(room)}
              accessories={[
                {
                  text: statusLabel(room),
                  icon: { source: Icon.Circle, tintColor: statusColor(room) },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Block this room">
                    <Action
                      title="Block 15 Min"
                      icon={Icon.Number15}
                      onAction={() => handleBlock(room, 15)}
                    />
                    {!room.occupied && (
                      <Action
                        title={`Block Until Next Meeting (${formatDuration(room.minutes)}${room.beyondWindow ? "+" : ""})`}
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd"], key: "enter" }}
                        onAction={() => handleBlock(room, room.minutes)}
                      />
                    )}
                    <Action
                      title="Block 30 Min"
                      icon={Icon.Number30}
                      onAction={() => handleBlock(room, 30)}
                    />
                    <Action
                      title="Block 1 Hour"
                      icon={Icon.Number60}
                      onAction={() => handleBlock(room, 60)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidate}
                    />
                    <Action
                      title="Manage Rooms"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      onAction={() =>
                        push(<ManageRooms onChanged={onRoomsChanged} />)
                      }
                    />
                    <Action
                      title="Reset Room Setup"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={handleResetRoomSetup}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function RoomBlockRoot() {
  const [rooms, setRooms] = useState<Room[] | null | "loading">("loading");

  async function load() {
    setRooms("loading");
    const { token } = getAccessToken();
    const email = await getCachedUserEmail(token);
    const loaded = await loadOrSeedRooms(email);
    setRooms(loaded);
  }

  useEffect(() => {
    load();
  }, []);

  if (rooms === "loading") {
    return <List isLoading searchBarPlaceholder="Loading Room Block..." />;
  }

  if (rooms === null) {
    return <Onboarding onComplete={(saved) => setRooms(saved)} />;
  }

  return <RoomList rooms={rooms} onRoomsChanged={load} />;
}

export default withAccessToken(google)(RoomBlockRoot);
