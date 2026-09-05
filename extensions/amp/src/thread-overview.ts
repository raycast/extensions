import {
  LaunchType,
  environment,
  launchCommand,
  updateCommandMetadata,
} from "@raycast/api";
import {
  loadThreads,
  readCachedThreadViews,
  statusForThread,
  titleForThread,
  type ThreadView,
} from "./lib/thread-status";

/**
 * Root search can only surface a single live line per command (an
 * updateCommandMetadata subtitle — there is no API for dynamic root-search
 * rows). This no-view command is that line: its interval refresh keeps the
 * subtitle current, and invoking it opens the real thread list.
 */

function subtitleFor(views: ThreadView[]): string {
  const running = views.filter((view) =>
    ["Working", "Starting", "Launching"].includes(statusForThread(view)),
  );
  const unread = views.filter((view) => view.unread);
  const parts: string[] = [];
  if (running.length) parts.push(`${running.length} running`);
  if (unread.length) parts.push(`${unread.length} unread`);
  if (!parts.length) return "No active threads";
  const headline = running[0] ?? unread[0];
  const title = headline ? titleForThread(headline) : undefined;
  return title
    ? `${parts.join(" · ")} — ${title.length > 48 ? `${title.slice(0, 47)}…` : title}`
    : parts.join(" · ");
}

export default async function Command() {
  if (environment.launchType === LaunchType.UserInitiated) {
    // Opening the list is the point; refresh the subtitle from cache so this
    // stays instant and leave the real refresh to the interval runs.
    await updateCommandMetadata({
      subtitle: subtitleFor(readCachedThreadViews()),
    });
    await launchCommand({ name: "threads", type: LaunchType.UserInitiated });
    return;
  }
  await updateCommandMetadata({
    subtitle: subtitleFor(await loadThreads({ all: false })),
  });
}
