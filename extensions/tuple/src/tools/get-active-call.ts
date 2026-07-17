import { getActiveCall, isNoActiveCall } from "../lib/tuple";

/**
 * Report whether the user is currently on a Tuple call: the call id, the user's own mute and
 * transcription state, the room slug for a room-based call (null for a direct call), and the other
 * participants — each with an email so follow-up actions (e.g. re-inviting someone) can address them.
 * A participant's `muted` and `connectionState` are null for room-based calls (Tuple reports a
 * peer's audio and connection state only for direct calls) — treat null as unknown, not as unmuted.
 */
export default async function () {
  // `tuple call current` returns the normalized roster (self already excluded)
  // and exits non-zero when there is no active call.
  try {
    const call = await getActiveCall();
    return {
      inCall: true,
      callId: call.call_id,
      // The user's own mic and transcription state (transcription is per-participant).
      muted: call.muted,
      transcribing: call.transcribing,
      // Slug of the room backing the call, or null for a direct call.
      activeRoomSlug: call.active_room_slug,
      participants: call.participants.map((p) => ({
        name: p.name || p.email,
        email: p.email,
        // Per-participant mute and connection state, when the call shape carries them (null for
        // room-based calls, which don't surface a peer's audio or connection state).
        muted: p.muted,
        connectionState: p.connection_state,
      })),
    };
  } catch (error) {
    if (isNoActiveCall(error)) {
      return { inCall: false };
    }
    throw error;
  }
}
