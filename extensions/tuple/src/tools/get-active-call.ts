import { callParticipants, isActiveCall, isCallMuted, isTranscribing, personName } from "../lib/call";
import { getState } from "../lib/tuple";

/** Report whether the user is currently on a Tuple call, with whom, their mute state, and whether they're transcribing it. */
export default async function () {
  // Read full state (not just `call current`) so room-based rosters can exclude the local user.
  const state = await getState();
  const call = state.current_call;
  if (!isActiveCall(call)) {
    return { inCall: false };
  }
  return {
    inCall: true,
    callId: call.id,
    muted: isCallMuted(call),
    // Transcription is per-participant; this is whether *you* are transcribing the call.
    transcribing: isTranscribing(call),
    participants: callParticipants(call, state.current_user?.id).map(personName),
  };
}
