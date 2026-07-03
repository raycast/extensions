import { listRooms } from "../lib/tuple";
import { Room } from "../lib/types";

/**
 * List Tuple rooms (personal and team) with who is currently in each. Rooms are persistent named
 * spaces that can be occupied even when the user is not on a call, so this answers "who is in the
 * Engineering room?" and "which rooms have someone in them right now?".
 */
export default async function () {
  // `tuple rooms list` returns one flat, kind-tagged array; split it back into personal/team. The
  // CLI's default count cap applies — an agent answering "which rooms have someone in them?" doesn't
  // need an unbounded dump that floods the model's context on large teams.
  const rooms = await listRooms();
  return {
    personal: rooms.filter((room) => room.kind === "personal").map(describeRoom),
    team: rooms.filter((room) => room.kind === "team").map(describeRoom),
  };
}

function describeRoom(room: Room) {
  return {
    name: room.name.trim() || "Personal Room",
    slug: room.slug,
    url: room.http_value,
    favorited: room.favorited,
    // True when the user's current call is in this room — lets an agent answer "which room am I in?".
    activeCall: room.active_call,
    occupants: room.members.map((member) => member.full_name || member.email).filter(Boolean),
  };
}
