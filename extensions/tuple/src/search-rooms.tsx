import { Action, ActionPanel, Color, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { TupleErrorEmptyView } from "./lib/empty-state";
import { useTupleJson } from "./lib/hooks";
import { joinCall, setRoomFavorite } from "./lib/tuple";
import { Room } from "./lib/types";

export default function SearchRooms() {
  // `tuple rooms list` returns one flat, kind-tagged array, with occupants and the active-room
  // marker resolved server-side. Pass --limit -1: this picker shows the user's complete room
  // list, so opt out of the CLI's default count cap.
  const { data, isLoading, error, revalidate } = useTupleJson<Room[]>(["rooms", "list", "--limit", "-1"], {
    failureTitle: "Could Not Load Rooms",
  });

  const rooms = data ?? [];
  const personal = sortRooms(rooms.filter((room) => room.kind === "personal"));
  const team = sortRooms(rooms.filter((room) => room.kind === "team"));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your rooms">
      <List.Section title="Personal">
        {personal.map((room) => (
          <RoomItem key={room.slug} room={room} onChange={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Team">
        {team.map((room) => (
          <RoomItem key={room.slug} room={room} onChange={revalidate} />
        ))}
      </List.Section>
      {error ? (
        <TupleErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Window}
          title="No Rooms"
          description="Your personal and team rooms will appear here."
        />
      )}
    </List>
  );
}

function RoomItem({ room, onChange }: { room: Room; onChange: () => void }) {
  const label = roomLabel(room);
  const occupants = room.members.map((member) => member.full_name || member.email || "Someone");
  const accessories: List.Item.Accessory[] = [];

  if (occupants.length > 0) {
    accessories.push({
      icon: { source: Icon.TwoPeople, tintColor: Color.Green },
      text: `${occupants.length}`,
      tooltip: `In the room: ${occupants.join(", ")}`,
    });
  }
  if (room.favorited) {
    accessories.push({ icon: "⭐", tooltip: "Favorite" });
  }
  if (room.active_call) {
    accessories.push({ tag: { value: "Active", color: Color.Green } });
  }

  return (
    <List.Item
      icon={Icon.Window}
      title={label}
      subtitle={occupants.length > 0 ? occupants.join(", ") : undefined}
      keywords={[room.slug, room.name, ...occupants]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Join Room" icon={Icon.Phone} onAction={() => joinRoom(room.slug, label)} />
          <Action
            title={room.favorited ? "Remove Favorite" : "Add Favorite"}
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => toggleFavorite(room, label, onChange)}
          />
          <Action.CopyToClipboard title="Copy Room Link" content={room.http_value} />
          <Action.OpenInBrowser title="Open in Browser" url={room.http_value} />
        </ActionPanel>
      }
    />
  );
}

async function joinRoom(slug: string, label: string) {
  try {
    await joinCall(slug);
    await showHUD(`Joining ${label}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Join Room" });
  }
}

async function toggleFavorite(room: Room, label: string, onChange: () => void) {
  try {
    await setRoomFavorite(room.slug, !room.favorited);
    await showToast({
      style: Toast.Style.Success,
      title: room.favorited ? "Removed Favorite" : "Added Favorite",
      message: label,
    });
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Update Favorite" });
  }
}

/** Occupied rooms first, then favorites, then by name. */
function sortRooms(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => {
    const aOccupied = a.members.length > 0;
    const bOccupied = b.members.length > 0;
    if (aOccupied !== bOccupied) {
      return aOccupied ? -1 : 1;
    }
    if (a.favorited !== b.favorited) {
      return a.favorited ? -1 : 1;
    }
    return roomLabel(a).localeCompare(roomLabel(b));
  });
}

/** Team rooms have names; personal rooms don't, so label them "Personal Room". */
function roomLabel(room: Room): string {
  return room.name.trim() || "Personal Room";
}
