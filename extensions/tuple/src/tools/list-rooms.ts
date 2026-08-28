import { listRooms } from "../lib/tuple";
import { primaryPersonalRoom, Room } from "../lib/types";

/**
 * List Tuple rooms (personal and team) with who is currently in each. Rooms are persistent named
 * spaces that can be occupied even when the user is not on a call, so this answers "who is in the
 * Engineering room?" and "which rooms have someone in them right now?".
 */
export default async function () {
  // `tuple rooms list` returns one flat, kind-tagged array; split it back into personal/team. The
  // CLI's default count cap applies — an agent answering "which rooms have someone in them?" doesn't
  // need an unbounded dump that floods the model's context on large teams.
  const [rooms, personalRooms] = await Promise.all([listRooms(), listRooms("--kind", "personal", "--limit", "-1")]);
  const primaryRoom = primaryPersonalRoom(personalRooms);
  const visiblePersonalRooms = rooms.filter((room) => room.kind === "personal");
  if (primaryRoom && !visiblePersonalRooms.some((room) => room.slug === primaryRoom.slug)) {
    visiblePersonalRooms.unshift(primaryRoom);
  }
  return {
    personal: visiblePersonalRooms.map((room) => describeRoom(room, room.slug === primaryRoom?.slug)),
    team: rooms.filter((room) => room.kind === "team").map((room) => describeRoom(room, false)),
  };
}

function describeRoom(room: Room, primary: boolean) {
  return {
    name: room.name.trim() || "Personal Room",
    slug: room.slug,
    url: room.http_value,
    favorited: room.favorited,
    primary,
    createdAt: room.created_at || undefined,
    // True when the user's current call is in this room — lets an agent answer "which room am I in?".
    activeCall: room.active_call,
    occupants: room.members.map((member) => member.full_name || member.email).filter(Boolean),
  };
}
