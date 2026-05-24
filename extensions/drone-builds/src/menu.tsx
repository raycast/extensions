/**
 * Background poller (no-view). Runs every minute (via `interval: "1m"` in the
 * manifest) plus whenever the user invokes it manually from the palette.
 *
 * Single responsibility: fetch /api/user/builds, diff against cached state,
 * fire Notification Center banners for terminal transitions / long-running /
 * failure streaks. There is no UI — visible browsing happens in the `builds`
 * (view) command.
 */
import {
  LaunchType,
  environment,
  getPreferenceValues,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  BuildStatus,
  DroneBuild,
  DroneFeed,
  getMe,
  listMyBuilds,
} from "./drone";
import { isMine, makeRepoMatcher } from "./filter";
import {
  failureStreak,
  findNewlyFinished,
  loadLongRunningNotified,
  loadSeen,
  saveLongRunningNotified,
  saveSeen,
} from "./dedup";
import { notify } from "./notify";

type Item = { build: DroneBuild; slug: string };

const MAX_NOTIFY_PER_TICK = 5;
const STREAK_THRESHOLD = 3;

function notifSound(status: BuildStatus): "Glass" | "Basso" | "Ping" {
  if (status === "success") return "Glass";
  if (status === "failure" || status === "error" || status === "killed")
    return "Basso";
  return "Ping";
}

function statusGlyph(status: BuildStatus): string {
  if (status === "success") return "✓";
  if (status === "failure" || status === "error" || status === "killed")
    return "✗";
  return "·";
}

function firstLine(s: string | undefined, max = 80): string {
  if (!s) return "";
  const line = s.split("\n")[0] ?? "";
  return line.length > max ? line.slice(0, max - 1) + "…" : line;
}

function isTerminalStatus(s: BuildStatus): boolean {
  return (
    s === "success" ||
    s === "failure" ||
    s === "error" ||
    s === "killed" ||
    s === "declined"
  );
}

/**
 * Per-slug newest-first list of terminal statuses from the current feed.
 * Used to compute trailing failure streaks for grouped/escalated notifications.
 */
function recentTerminalBySlug(items: Item[]): Map<string, BuildStatus[]> {
  const map = new Map<string, BuildStatus[]>();
  for (const it of items) {
    if (!isTerminalStatus(it.build.status)) continue;
    const list = map.get(it.slug) ?? [];
    if (list.length < 5) list.push(it.build.status);
    map.set(it.slug, list);
  }
  return map;
}

function parseLongRunningSec(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n * 60);
}

export default async function Command(): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const isUserInitiated = environment.launchType === LaunchType.UserInitiated;

  try {
    if (!prefs.droneUrl || !prefs.droneToken) {
      if (isUserInitiated) {
        await showFailureToast(
          new Error("Set Drone URL and token in extension preferences"),
          {
            title: "Drone not configured",
          },
        );
      }
      return;
    }

    const [me, feed] = await Promise.all([getMe(), listMyBuilds(1)]);

    const normalized: Item[] = feed
      .filter((f): f is DroneFeed & { build: DroneBuild } => f.build != null)
      .map((f) => ({ build: f.build, slug: f.slug }));

    const matcher = makeRepoMatcher(prefs);
    const filtered = normalized
      .filter((it) => prefs.filterMode === "all" || isMine(it.build, me))
      .filter((it) => matcher(it.slug));

    // ---------- Notification: terminal-state transitions ----------
    const seen = loadSeen();
    const flat = filtered.map((it) => ({
      id: it.build.id,
      status: it.build.status,
      slug: it.slug,
      build: it.build,
    }));
    const newlyFinished = findNewlyFinished(flat, seen);
    saveSeen(seen);

    const recentBySlug = recentTerminalBySlug(filtered);
    const toNotify = newlyFinished.slice(0, MAX_NOTIFY_PER_TICK);
    const notifyJobs: Array<Promise<unknown>> = toNotify.map((n) => {
      const streak = failureStreak(recentBySlug.get(n.slug) ?? []);
      const prefix =
        streak >= STREAK_THRESHOLD ? `🔥 ${streak} in a row · ` : "";
      return notify(
        {
          title: `${prefix}Drone ${statusGlyph(n.build.status)} ${n.slug} #${n.build.number}`,
          subtitle: firstLine(n.build.message, 80),
          message: `${n.build.event} · ${n.build.target || n.build.ref} · ${n.build.author_login || n.build.sender}`,
          openUrl: n.build.link,
          groupKey: `drone-${n.build.id}`,
          sound: notifSound(n.build.status),
        },
        { preferTerminalNotifier: !!prefs.useTerminalNotifier },
      ).catch(() => {
        // notify() routes failures to showFailureToast internally; swallow so one bad notify doesn't break the tick
      });
    });

    // ---------- Notification: long-running running builds ----------
    const longRunningSec = parseLongRunningSec(prefs.longRunningMinutes);
    const longRunningNotified = loadLongRunningNotified();
    if (longRunningSec > 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      const stale = filtered.filter(
        (it) =>
          it.build.status === "running" &&
          it.build.started > 0 &&
          nowSec - it.build.started >= longRunningSec &&
          !longRunningNotified.has(it.build.id),
      );
      const toFire = stale.slice(0, MAX_NOTIFY_PER_TICK);
      for (const n of toFire) {
        longRunningNotified.add(n.build.id);
        notifyJobs.push(
          notify(
            {
              title: `⏱ Still running · ${n.slug} #${n.build.number}`,
              subtitle: firstLine(n.build.message, 80),
              message: `Running for ${Math.floor((nowSec - n.build.started) / 60)}m — ${n.build.target || n.build.ref}`,
              openUrl: n.build.link,
              groupKey: `drone-long-${n.build.id}`,
              sound: "Ping",
            },
            { preferTerminalNotifier: !!prefs.useTerminalNotifier },
          ).catch(() => {}),
        );
      }
    }
    // Free notified entries when their builds are no longer running
    for (const it of filtered) {
      if (
        it.build.status !== "running" &&
        longRunningNotified.has(it.build.id)
      ) {
        longRunningNotified.delete(it.build.id);
      }
    }
    saveLongRunningNotified(longRunningNotified);

    await Promise.all(notifyJobs);

    // ---------- Root-search subtitle ----------
    const runningCount = filtered.filter(
      (it) => it.build.status === "running",
    ).length;
    await updateCommandMetadata({
      subtitle: runningCount > 0 ? `${runningCount} running` : "Drone CI",
    });
  } catch (e) {
    if (isUserInitiated) {
      await showFailureToast(e as Error, { title: "Drone API error" });
    }
    // background ticks swallow errors — next tick retries
  }
}
