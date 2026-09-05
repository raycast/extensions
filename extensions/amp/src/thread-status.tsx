import {
  Clipboard,
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  environment,
  launchCommand,
  open,
  showHUD,
  type Image,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { makeAttachCommand, openThreadInTerminal } from "./lib/amp";
import { ensureWindowInfoBinary } from "./lib/capture";
import { markThreadRead } from "./lib/storage";
import {
  cacheThreadViews,
  loadThreads,
  readCachedThreadViews,
  statusForThread,
  titleForThread,
  updatedAtForThread,
  webURLForThread,
  type ThreadView,
  type ThreadStatus,
} from "./lib/thread-status";

function statusIcon(status: ThreadStatus): Image.ImageLike {
  const tintColor =
    status === "Working"
      ? Color.Orange
      : status === "Complete"
        ? Color.Green
        : status === "Failed"
          ? Color.Red
          : Color.Blue;
  const source =
    status === "Working"
      ? Icon.CircleProgress
      : status === "Complete"
        ? Icon.CheckCircle
        : status === "Failed"
          ? Icon.ExclamationMark
          : Icon.Clock;
  return { source, tintColor };
}

function countsForThreads(threads: ThreadView[]): {
  running: number;
  unread: number;
} {
  const statuses = threads.map(statusForThread);
  return {
    running: statuses.filter((status) =>
      ["Working", "Starting", "Launching"].includes(status),
    ).length,
    unread: threads.filter((thread) => thread.unread).length,
  };
}

function ThreadSubmenu({
  view,
  onRead,
}: {
  view: ThreadView;
  onRead: (view: ThreadView) => Promise<void>;
}) {
  const status = statusForThread(view);
  const title = titleForThread(view);
  const webURL = webURLForThread(view);
  const project = view.trackedRun?.project
    ? `${view.trackedRun.project.namespace}/${view.trackedRun.project.name}`
    : view.live?.project;

  return (
    <MenuBarExtra.Submenu
      title={`${title} — ${view.unread ? "Unread" : status}`}
      icon={
        view.unread
          ? { source: Icon.CircleFilled, tintColor: Color.Blue }
          : statusIcon(status)
      }
    >
      <MenuBarExtra.Item title={`Status: ${status}`} />
      {project ? <MenuBarExtra.Item title={`Project: ${project}`} /> : null}
      <MenuBarExtra.Separator />
      {webURL ? (
        <MenuBarExtra.Item
          title="Open in Browser"
          icon={Icon.Globe}
          onAction={async () => {
            await onRead(view);
            await open(webURL);
          }}
        />
      ) : null}
      <MenuBarExtra.Item
        title="Open in Terminal"
        icon={Icon.Terminal}
        onAction={async () => {
          await onRead(view);
          await openThreadInTerminal(environment.supportPath, view.threadId);
        }}
      />
      <MenuBarExtra.Item
        title="Copy Attach Command"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(await makeAttachCommand(view.threadId));
          await showHUD("Attach command copied");
        }}
      />
      {view.error ? (
        <MenuBarExtra.Item
          title="Copy Runner Log"
          icon={Icon.Document}
          onAction={async () => {
            await Clipboard.copy(view.error!);
            await showHUD("Runner log copied");
          }}
        />
      ) : null}
    </MenuBarExtra.Submenu>
  );
}

export default function Command() {
  const [threads, setThreads] = useState<ThreadView[]>(readCachedThreadViews);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    // Piggyback on the minute refresh to keep the capture helper compiled, so
    // Capture Window never pays the Swift interpreter startup.
    void ensureWindowInfoBinary();
    try {
      setThreads(await loadThreads({ all: false }));
      setError(undefined);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : String(refreshError),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (view: ThreadView) => {
      if (!view.unread) return;
      await markThreadRead(view.threadId, updatedAtForThread(view));
      const nextThreads = threads.map((thread) =>
        thread.threadId === view.threadId
          ? { ...thread, unread: false }
          : thread,
      );
      setThreads(nextThreads);
      cacheThreadViews(nextThreads);
    },
    [threads],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeThreads = useMemo(
    () =>
      threads.filter((thread) =>
        ["Working", "Starting", "Launching"].includes(statusForThread(thread)),
      ),
    [threads],
  );
  const recentThreads = useMemo(
    () =>
      threads.filter((thread) => !activeThreads.includes(thread)).slice(0, 10),
    [activeThreads, threads],
  );
  const counts = countsForThreads(threads);
  // A static asset plus native menu bar text: Raycast renders generated SVGs
  // unpredictably, but a plain PNG and a title always come out crisp.
  const menuIcon: Image.ImageLike = error
    ? statusIcon("Failed")
    : counts.running > 0
      ? "amp-mark-running.png"
      : counts.unread > 0
        ? "amp-mark-unread.png"
        : "amp-mark-idle.png";
  // Only active state is counted, never the total thread count. Running and
  // unread both show when both exist; the icon color names the leading one.
  const menuTitle =
    [
      counts.running > 0 ? String(counts.running) : undefined,
      counts.unread > 0 ? String(counts.unread) : undefined,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;
  const tooltip = error
    ? `Could not refresh Amp thread status: ${error}`
    : `${counts.running} running, ${counts.unread} unread, ${threads.length} recent`;

  return (
    <MenuBarExtra
      icon={menuIcon}
      title={menuTitle}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {error ? (
        <MenuBarExtra.Section title="Status">
          <MenuBarExtra.Item title="Could not refresh Amp threads" />
          <MenuBarExtra.Item title={error} />
        </MenuBarExtra.Section>
      ) : null}
      {activeThreads.length > 0 ? (
        <MenuBarExtra.Section title="Active Threads">
          {activeThreads.map((thread) => (
            <ThreadSubmenu
              key={thread.threadId}
              view={thread}
              onRead={markRead}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      {recentThreads.length > 0 ? (
        <MenuBarExtra.Section title="Recent Threads">
          {recentThreads.map((thread) => (
            <ThreadSubmenu
              key={thread.threadId}
              view={thread}
              onRead={markRead}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      {!isLoading && !error && threads.length === 0 ? (
        <MenuBarExtra.Item title="No Amp threads found" />
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Thread List"
          icon={Icon.List}
          onAction={() =>
            launchCommand({ name: "threads", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Start New Thread"
          icon={Icon.Plus}
          onAction={() =>
            launchCommand({
              name: "new-thread",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Refresh Thread Status"
          icon={Icon.ArrowClockwise}
          onAction={refresh}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
