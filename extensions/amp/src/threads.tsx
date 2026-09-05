import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  environment,
  launchCommand,
  open,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  makeAttachCommand,
  openThreadInTerminal,
  setThreadVisibility,
} from "./lib/amp";
import { markThreadRead } from "./lib/storage";
import {
  cacheThreadViews,
  loadThreads,
  readCachedThreadViews,
  statusForThread,
  titleForThread,
  updatedAtForThread,
  webURLForThread,
  type ThreadStatus,
  type ThreadView,
} from "./lib/thread-status";

function statusColor(status: ThreadStatus): Color {
  if (status === "Failed") return Color.Red;
  if (status === "Working") return Color.Orange;
  if (status === "Complete") return Color.Green;
  return Color.Blue;
}

export default function Command() {
  const [runs, setRuns] = useState<ThreadView[]>(readCachedThreadViews);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setRuns(await loadThreads());
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

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const markRead = useCallback(async (view: ThreadView) => {
    if (!view.unread) return;
    await markThreadRead(view.threadId, updatedAtForThread(view));
    setRuns((current) => {
      const next = current.map((thread) =>
        thread.threadId === view.threadId
          ? { ...thread, unread: false }
          : thread,
      );
      cacheThreadViews(next);
      return next;
    });
    void launchCommand({
      name: "thread-status",
      type: LaunchType.Background,
    }).catch(() => undefined);
  }, []);

  const emptyTitle = useMemo(() => {
    if (error) return "Could not load Amp threads";
    return isLoading ? "Loading Amp threads…" : "No Amp threads found";
  }, [error, isLoading]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your Amp threads">
      {runs.length === 0 ? (
        <List.EmptyView
          title={emptyTitle}
          description={error}
          icon={error ? Icon.Warning : Icon.Cloud}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {runs.map((view) => {
        const status = statusForThread(view);
        const title = titleForThread(view);
        const webURL = webURLForThread(view);
        return (
          <List.Item
            key={view.threadId}
            icon={view.live?.working ? Icon.CircleProgress100 : Icon.Cloud}
            title={title}
            subtitle={
              view.trackedRun?.project
                ? `${view.trackedRun.project.namespace}/${view.trackedRun.project.name}`
                : view.live?.project
            }
            accessories={[
              ...(view.unread
                ? [{ tag: { value: "Unread", color: Color.Blue } }]
                : []),
              { tag: { value: status, color: statusColor(status) } },
              {
                date: new Date(
                  view.thread?.updated ??
                    view.live?.updatedAt ??
                    view.trackedRun?.createdAt ??
                    0,
                ),
                tooltip: "Updated",
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Browser"
                  icon={Icon.Globe}
                  onAction={async () => {
                    await markRead(view);
                    await open(webURL);
                  }}
                />
                <Action
                  title="Copy URL"
                  icon={Icon.Link}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={async () => {
                    await Clipboard.copy(webURL);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Thread URL copied",
                    });
                  }}
                />
                <Action
                  title="Make Public and Copy URL"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Making thread public…",
                    });
                    try {
                      await setThreadVisibility(view.threadId, "unlisted");
                      await Clipboard.copy(webURL);
                      toast.style = Toast.Style.Success;
                      toast.title = "Thread is public — URL copied";
                    } catch (visibilityError) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Could not change visibility";
                      toast.message =
                        visibilityError instanceof Error
                          ? visibilityError.message
                          : String(visibilityError);
                    }
                  }}
                />
                <Action
                  title="Make Internal and Copy URL"
                  icon={Icon.TwoPeople}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Making thread internal…",
                    });
                    try {
                      await setThreadVisibility(view.threadId, "workspace");
                      await Clipboard.copy(webURL);
                      toast.style = Toast.Style.Success;
                      toast.title = "Thread is workspace-visible — URL copied";
                    } catch (visibilityError) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Could not change visibility";
                      toast.message =
                        visibilityError instanceof Error
                          ? visibilityError.message
                          : String(visibilityError);
                    }
                  }}
                />
                <Action
                  title="Copy Attach Command"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  onAction={async () => {
                    await Clipboard.copy(
                      await makeAttachCommand(view.threadId),
                    );
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Attach command copied",
                    });
                  }}
                />
                <Action
                  title="Open in Terminal"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  onAction={async () => {
                    await markRead(view);
                    await openThreadInTerminal(
                      environment.supportPath,
                      view.threadId,
                    );
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refresh}
                />
                {view.error ? (
                  <Action.CopyToClipboard
                    title="Copy Runner Log"
                    content={view.error}
                    icon={Icon.Clipboard}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
