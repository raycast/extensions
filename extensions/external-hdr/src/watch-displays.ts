import { listDisplays, setHdr } from "./hdr";
import { readRules, readSeen, writeSeen } from "./lib/rules";

/**
 * Background command: applies rules for displays that just connected.
 * It runs on a manifest interval and must never surface UI or throw.
 */
export default async function watchDisplays(): Promise<void> {
  try {
    const displays = await listDisplays();
    const { rules } = await readRules();
    const seen = await readSeen();

    const seenUuids = new Set(seen ?? []);
    const firstRun = seen === null;

    for (const rule of rules) {
      const display = displays.find((candidate) => candidate.uuid === rule.uuid);
      if (display === undefined) continue;
      if (!firstRun && seenUuids.has(rule.uuid)) continue;
      if (display.hdr === rule.hdr) continue;

      await setHdr(display.id, rule.hdr ? "on" : "off");
    }

    await writeSeen(displays.map((display) => display.uuid));
  } catch {
    // Background command: stay quiet. The next interval retries.
  }
}
