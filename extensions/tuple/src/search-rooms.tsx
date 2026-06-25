import { Action, ActionPanel, Color, Icon, List, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { TupleErrorEmptyView } from "./lib/empty-state";
import { useTupleJson } from "./lib/hooks";
import { joinCall } from "./lib/tuple";
import { Room, TupleState } from "./lib/types";

export default function SearchRooms() {
  const { data, isLoading, error, revalidate } = useTupleJson<TupleState>(["state"], {
    failureTitle: "Could Not Load Rooms",
  });

  const rooms = data?.rooms;
  const activeSlug = data?.current_call?.room?.url?.slug;
  const personal = sortRooms(rooms?.personal ?? []);
  const team = sortRooms(rooms?.team ?? []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your rooms">
      <List.Section title="Personal">
        {personal.map((room) => (
          <RoomItem key={room.slug} room={room} activeSlug={activeSlug} />
        ))}
      </List.Section>
      <List.Section title="Team">
        {team.map((room) => (
          <RoomItem key={room.slug} room={room} activeSlug={activeSlug} />
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

function RoomItem({ room, activeSlug }: { room: Room; activeSlug?: string }) {
  const label = roomLabel(room);
  const occupants = (room.members ?? []).map(
    (member) => member.full_name ?? member.short_name ?? member.email ?? "Someone",
  );
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
  if (room.slug === activeSlug) {
    accessories.push({ tag: { value: "Active", color: Color.Green } });
  }

  return (
    <List.Item
      icon={Icon.Window}
      title={label}
      subtitle={occupants.length > 0 ? occupants.join(", ") : undefined}
      keywords={[room.slug, room.name ?? "", ...occupants]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Join Room" icon={Icon.Phone} onAction={() => joinRoom(room.slug, label)} />
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

/** Occupied rooms first, then favorites, then by name. */
function sortRooms(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => {
    const aOccupied = (a.members?.length ?? 0) > 0;
    const bOccupied = (b.members?.length ?? 0) > 0;
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
  return room.name?.trim() || "Personal Room";
}
