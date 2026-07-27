/**
 * The background watcher. Raycast runs this on a schedule (see the command's
 * "interval" in package.json, adjustable per-user in Raycast's preferences),
 * even when Raycast itself isn't open.
 *
 * Every run: fetch the categories, diff them against the last run's
 * fingerprints, record what changed in the Activity Inbox, and — only if the
 * user has explicitly opted in — deliver desktop banners.
 */
import { environment, updateCommandMetadata } from "@raycast/api";

import { fetchCategory } from "./hooks";
import {
  diffCandidates,
  inQuietHours,
  loadActivity,
  recordActivity,
  setLastRun,
  signature,
  targetUrl,
  type ActivityEvent,
  type Candidate,
  type Change,
} from "./lib/activity";
import { loadConfig, type ActivityKind, type Config } from "./lib/config";
import { checkGhStatus, isBlocked } from "./lib/gh-status";
import { fetchViewer } from "./lib/github";
import { notificationsAvailable, send } from "./lib/notify";
import { buildCategories } from "./lib/tabs";

/** Which built-in category feeds which activity kind. */
const CATEGORY_TO_KIND: Record<string, ActivityKind> = {
  "review-requested": "review-requested",
  "awaiting-reply": "awaiting-reply",
  "my-prs": "my-pr-activity",
  watching: "watching",
};

/** Keep background runs quick — the inbox doesn't need deep pagination. */
const BACKGROUND_LIMIT = 30;

/** The macOS sound played when the user has asked for one. */
const SOUND_NAME = "Ping";

/** A short, specific description of what happened, for the banner and the inbox. */
function describe(change: Change): string {
  const { pr, kind, isNew } = change;

  switch (kind) {
    case "review-requested":
      return isNew ? "Needs your review" : `Updated · ${pr.comments} comments`;

    case "awaiting-reply": {
      const threads = `${pr.awaitingReply} thread${pr.awaitingReply === 1 ? "" : "s"} awaiting you`;
      return pr.latestReplier ? `@${pr.latestReplier} replied · ${threads}` : threads;
    }

    case "my-pr-activity":
      if (pr.reviewDecision === "APPROVED") return "Approved";
      if (pr.reviewDecision === "CHANGES_REQUESTED") return "Changes requested";
      if (pr.awaitingReply > 0) {
        return pr.latestReplier
          ? `@${pr.latestReplier} replied · ${pr.awaitingReply} awaiting you`
          : `${pr.awaitingReply} threads awaiting you`;
      }
      return `${pr.comments} comments · ${pr.unresolved} unresolved`;

    case "watching":
      return isNew ? `New pull request by @${pr.author}` : `Updated · ${pr.comments} comments`;
  }
}

/** Who to attribute the change to. */
function actorOf(change: Change): string {
  return change.pr.latestReplier || change.pr.author;
}

function toEvent(change: Change): ActivityEvent {
  const { pr, kind } = change;
  return {
    // The fingerprint is part of the id, so re-recording the same state is a
    // no-op but genuinely new activity always lands.
    id: `${kind}:${pr.repository}#${pr.number}:${signature(pr)}`,
    kind,
    prKey: `${pr.repository}#${pr.number}`,
    repository: pr.repository,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    commentUrl: pr.awaitingUrl || undefined,
    actor: actorOf(change),
    summary: describe(change),
    at: pr.lastActivity,
    read: false,
    notified: false,
  };
}

/** Reports whether a banner should fire for this event, given the settings. */
function shouldNotify(config: Config, event: ActivityEvent): boolean {
  const { notifications } = config;
  if (!notifications.enabled) return false;
  if (!notifications.kinds[event.kind]) return false;
  if (!notificationsAvailable()) return false;
  if (inQuietHours(notifications)) return false;
  return true;
}

/**
 * Fires one banner per event, capped by the user's limit, with the remainder
 * folded into a single summary so a busy morning can't storm Notification
 * Center.
 */
async function deliver(config: Config, events: ActivityEvent[]): Promise<ActivityEvent[]> {
  const cap = Math.max(1, config.notifications.maxBanners);
  const sound = config.notifications.sound ? SOUND_NAME : undefined;

  const individual = events.length > cap ? events.slice(0, cap - 1) : events;
  const overflow = events.length - individual.length;

  const delivered: ActivityEvent[] = [];
  for (const event of individual) {
    const ok = await send({
      title: "GH Review",
      subtitle: `${event.repository} #${event.number}`,
      body: `${event.kind === "review-requested" ? "🔴" : "💬"} ${event.title} — ${event.summary}`,
      // Grouping by PR means a chatty thread replaces its own banner rather
      // than stacking up.
      group: `gh-review-${event.prKey}`,
      // Clicking the banner should land on the comment, not the PR header.
      url: targetUrl(event),
      sound,
    });
    if (ok) delivered.push(event);
  }

  if (overflow > 0) {
    await send({
      title: "GH Review",
      body: `and ${overflow} more pull request${overflow === 1 ? "" : "s"} updated`,
      group: "gh-review-overflow",
      sound,
    });
  }
  return delivered;
}

export default async function Command() {
  try {
    // Don't poll GitHub — or burn a retry cycle — while the CLI isn't set up.
    // The subtitle is the only surface a background command has to say so.
    const status = await checkGhStatus();
    if (isBlocked(status)) {
      await updateCommandMetadata({
        subtitle:
          status.state === "not-installed"
            ? "GitHub CLI not installed — run `brew install gh`"
            : status.state === "not-authenticated"
              ? "GitHub CLI not authenticated — run `gh auth login`"
              : status.state === "ready"
                ? "Missing the `repo` scope — run `gh auth refresh -s repo`"
                : "Can't reach GitHub",
      });
      return;
    }

    const config = await loadConfig();
    const viewer = await fetchViewer();

    // Only the built-in categories map to an activity kind; saved filters are
    // deliberately excluded so the inbox stays about *you*.
    const categories = buildCategories(config, viewer).filter((c) => CATEGORY_TO_KIND[c.id]);

    const candidates: Candidate[] = (
      await Promise.all(
        categories.map(async (category) => {
          const prs = await fetchCategory(category, viewer.login, config.ignoredAuthors, BACKGROUND_LIMIT);
          return prs.map((pr) => ({ kind: CATEGORY_TO_KIND[category.id], pr }));
        }),
      )
    ).flat();

    const { changes, commit } = await diffCandidates(candidates);
    const events = changes.map(toEvent);

    // Drop anything the inbox already holds, so a banner never repeats for
    // activity that hasn't actually moved on.
    const recorded = new Set((await loadActivity()).map((e) => e.id));
    const fresh = events.filter((e) => !recorded.has(e.id));

    const notifiable = fresh.filter((event) => shouldNotify(config, event));
    const delivered = notifiable.length > 0 ? await deliver(config, notifiable) : [];
    const deliveredIds = new Set(delivered.map((e) => e.id));

    // Record everything new — even when banners are off (or muted by quiet
    // hours), the Activity Inbox is the durable record of what happened.
    await recordActivity(fresh.map((e) => (deliveredIds.has(e.id) ? { ...e, notified: true } : e)));

    // Only now advance the baseline. If anything above threw, the next run
    // re-detects these changes and records them, rather than treating
    // unrecorded activity as already seen and dropping it for good.
    await commit();

    await setLastRun(new Date());

    const waiting = candidates.filter((c) => c.kind === "review-requested" || c.kind === "awaiting-reply").length;
    await updateCommandMetadata({
      subtitle: waiting > 0 ? `${waiting} waiting on you` : "Nothing waiting on you",
    });
  } catch (error) {
    // A background run must never surface a crash dialog. Log it (visible in
    // `npm run dev`) and let the next interval try again.
    if (environment.isDevelopment) {
      console.error("gh-review watch failed:", error);
    }
    await updateCommandMetadata({ subtitle: "Couldn't reach GitHub — check `gh auth status`" });
  }
}
