export const MENU_BAR_QUIET_MS = 25 * 60_000;

export const isMenuBarOff = (ranAt: number | undefined, now = Date.now()) =>
  ranAt === undefined || now - ranAt > MENU_BAR_QUIET_MS;

const PING_WINDOW_MS = 10_000;

export const recentlyPinged = (pingedAt: number | undefined, now = Date.now()) =>
  pingedAt !== undefined && now >= pingedAt && now - pingedAt < PING_WINDOW_MS;

export async function heartbeatMoved<T>(
  read: () => Promise<T>,
  before: T,
  pause: () => Promise<unknown>,
  tries: number,
): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    await pause();
    if ((await read()) !== before) return true;
  }
  return false;
}
