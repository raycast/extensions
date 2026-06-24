import { CurrentCall } from "./types";

/** A person in the call, normalized across the direct-call and room-based shapes. */
export interface CallPerson {
  id?: number;
  full_name?: string;
  short_name?: string;
  email?: string;
}

/**
 * Interpretation of the live-call JSON shape, confirmed against a real call. Keeping it in one
 * place means the menu bar, the mute toggle, and the AI tool all read a call the same way — and
 * if the CLI's shape ever shifts, there's a single spot to update.
 */

/** A populated current_call (vs. null/absent when idle) carries an id. */
export function isActiveCall(call: CurrentCall | null | undefined): call is CurrentCall {
  return !!call?.id;
}

/** Mic off → muted. The CLI reports this as `local.audio_enabled === false`. */
export function isCallMuted(call: CurrentCall): boolean {
  return call.local?.audio_enabled === false;
}

/**
 * Whether the local user is transcribing the call (transcription is per-participant; `recorder`
 * is the local user's own transcription lifecycle, which is what the Start/Stop toggle controls).
 * `recorder.state` cycles through off → downloading → starting → on → stopping; treat anything other
 * than off/absent as active so the menu-bar toggle doesn't flip to "Start" mid-transition.
 */
export function isTranscribing(call: CurrentCall): boolean {
  const state = call.recorder?.state;
  return !!state && state !== "off";
}

/**
 * The other people in the call. Direct calls list them in top-level `participants`; room-based
 * calls list them in `room.members` (presence "in-call", and including the local user — so pass
 * `selfId` to drop yourself). Merged and de-duplicated by id/email.
 */
export function callParticipants(call: CurrentCall, selfId?: number): CallPerson[] {
  const people: CallPerson[] = (call.participants ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    short_name: p.short_name,
    email: p.email,
  }));

  for (const member of call.room?.members ?? []) {
    if (member.id === selfId) {
      continue;
    }
    if (!member.presence?.some((p) => p.value === "in-call")) {
      continue;
    }
    people.push({ id: member.id, full_name: member.full_name, short_name: member.short_name, email: member.email });
  }

  const seen = new Set<string>();
  return people.filter((person) => {
    const key = String(person.id ?? person.email ?? "");
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function personName(person: CallPerson): string {
  return person.full_name ?? person.short_name ?? person.email ?? "Participant";
}

/** Remove the `[[...]]` match markers the transcript search adds around matched terms. */
export function stripMatchMarkers(text: string): string {
  return text.replace(/\[\[|\]\]/g, "");
}
