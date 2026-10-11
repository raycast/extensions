import type { Cli } from "./cli";
import type { RitualChange, RitualHabit } from "./types";

export function listHabits(cli: Cli): Promise<RitualHabit[]> {
  return cli.list<RitualHabit>(["habits"]);
}

/// Check-ins are per SLOT, not per day: a habit placed in both routines isn't
/// complete until both are, so the slot travels with the request.
export function checkInHabit(
  cli: Cli,
  id: string,
  slot: string,
): Promise<RitualChange> {
  return cli.json<RitualChange>(["checkin", id, "--slot", slot]);
}
