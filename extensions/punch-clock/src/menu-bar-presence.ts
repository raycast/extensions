export const MENU_BAR_HEARTBEAT_MS = 15_000;

/** Longer than the heartbeat interval so one delayed beat still counts as visible. */
export const MENU_BAR_HEARTBEAT_TTL_MS = 45_000;

export function isMenuBarHeartbeatFresh(stored: string | undefined, now: number): boolean {
  if (!stored) return false;
  const seenAt = Number(stored);
  if (!Number.isFinite(seenAt)) return false;
  const age = now - seenAt;
  return age >= 0 && age <= MENU_BAR_HEARTBEAT_TTL_MS;
}
