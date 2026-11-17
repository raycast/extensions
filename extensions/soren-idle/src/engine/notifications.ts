import { formatBundle } from "./format";
import { Report, Settings } from "./types";

/** The macOS notification for what a ticker run found, or undefined if nothing is switched on for it. */
export function notificationFor(r: Report, settings: Settings): string | undefined {
  const candidates: [boolean, string | undefined][] = [
    [settings.notifyStopped, r.stoppedReason],
    [settings.notifyFinished, r.completed],
    [settings.notifyBounty, r.bounties.length ? `Bounty complete: +${r.bounties[0].marks} Marks` : undefined],
    [settings.notifyRare, Object.keys(r.rare).length ? `Rare find: ${formatBundle(r.rare)}` : undefined],
  ];
  return candidates.find(([on, message]) => on && message)?.[1];
}
