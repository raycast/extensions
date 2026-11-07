const HUD_MS = 1000; // refresh before the previous HUD (about 2 s) starts to fade, so it is renewed without a pulse

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Keeps a HUD on screen for about `seconds`, since Raycast has no way to set its duration. */
export async function holdHUD(
  show: (text: string) => Promise<void>,
  text: string,
  seconds: number,
  sleep: (ms: number) => Promise<void> = wait,
) {
  const times = Math.max(1, Math.ceil((seconds * 1000) / HUD_MS));
  for (let i = 0; i < times; i++) {
    await show(text);
    if (i < times - 1) await sleep(HUD_MS);
  }
}

/**
 * Off unless the user turns it on: showing a HUD closes the Raycast window if it is open, so it should
 * not surprise anyone who has not asked for it. Raycast can also hand back an empty preference.
 */
export const notificationsEnabled = (prefs: { notifications?: boolean }) => prefs.notifications === true;

/** How long the notice stays up, from the dropdown preference ("2" or "6" seconds). */
export function noticeSeconds(prefs: { noticeDuration?: string }): number {
  const n = Number(prefs.noticeDuration);
  return n === 2 || n === 6 ? n : 6;
}
