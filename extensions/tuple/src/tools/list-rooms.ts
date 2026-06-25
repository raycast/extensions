import { getRooms } from "../lib/tuple";
import { Room } from "../lib/types";

/**
 * List Tuple rooms (personal and team) with who is currently in each. Rooms are persistent named
 * spaces that can be occupied even when the user is not on a call, so this answers "who is in the
 * Engineering room?" and "which rooms have someone in them right now?".
 */
export default async function () {
  const rooms = await getRooms();
  return {
    personal: (rooms.personal ?? []).map(describeRoom),
    team: (rooms.team ?? []).map(describeRoom),
  };
}

function describeRoom(room: Room) {
  return {
    name: room.name?.trim() || "Personal Room",
    slug: room.slug,
    url: room.http_value,
    favorited: Boolean(room.favorited),
    occupants: (room.members ?? [])
      .map((member) => member.full_name ?? member.short_name ?? member.email)
      .filter((name): name is string => Boolean(name)),
  };
}
