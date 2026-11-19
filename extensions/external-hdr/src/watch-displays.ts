import { listDisplays, setHdr } from "./hdr";
import { readRules, readSeen, writeSeen } from "./lib/rules";

/**
 * Background command: applies rules for displays that just connected.
 * It runs on a manifest interval and must never surface UI or throw.
 *
 * A display counts as reconnected when its UUID is absent from the previous
 * check or when its system display id changed — macOS usually assigns a new id
 * on reconnect, which catches unplug/replug that happened between two runs.
 * A rule that fails stays out of the seen list so the next check retries it
 * without blocking any other display.
 */
export default async function watchDisplays(): Promise<void> {
  try {
    const displays = await listDisplays();
    const { rules } = await readRules();
    const seen = await readSeen();

    const previous = new Map((seen ?? []).map((entry) => [entry.uuid, entry.id]));
    const firstRun = seen === null;
    const handled = new Set<string>();

    for (const display of displays) {
      const rule = rules.find((candidate) => candidate.uuid === display.uuid);

      if (rule === undefined) {
        handled.add(display.uuid);
        continue;
      }

      const reconnected = firstRun || !previous.has(display.uuid) || previous.get(display.uuid) !== display.id;

      if (!reconnected) {
        handled.add(display.uuid);
        continue;
      }

      try {
        if (display.hdr !== rule.hdr) {
          await setHdr(display.id, rule.hdr ? "on" : "off");
        }
        handled.add(display.uuid);
      } catch {
        // Leave this display out of the seen list: retry on the next check.
      }
    }

    await writeSeen(
      displays
        .filter((display) => handled.has(display.uuid))
        .map((display) => ({ uuid: display.uuid, id: display.id })),
    );
  } catch {
    // Background command: stay quiet. The next interval retries.
  }
}
