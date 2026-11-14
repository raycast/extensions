import { listOngoingCalls } from "../lib/tuple";

/** List live Tuple calls using the CLI's canonical grouping and visibility rules. */
export default async function () {
  return (await listOngoingCalls()).map((call) => ({
    id: call.id,
    participants: call.participants.map((participant) => ({
      name: participant.full_name,
      email: participant.email,
    })),
    unknownParticipants: call.unknown_participants,
    anonymous: call.anonymous,
    capacity: call.capacity,
    joinable: call.joinable,
    room: call.room,
    current: call.current,
  }));
}
