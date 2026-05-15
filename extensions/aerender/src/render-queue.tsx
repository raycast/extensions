import { Action, ActionPanel, List, showToast, Toast, Icon, Color, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { getRenderHistory, RenderHistory, formatDuration, updateRenderInHistory } from "./utils/render-history";
import { dirname } from "node:path";

export default function RenderQueue() {
  const [history, setHistory] = useState<RenderHistory[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;
    let isDisposed = false;

    async function loadHistory() {
      try {
        let renderHistory = await getRenderHistory();
        const staleRunningRenders = renderHistory.filter((render) => {
          if (render.status !== "running") return false;
          if (!render.pid) return true;

          try {
            process.kill(render.pid, 0);
            return false;
          } catch (checkError) {
            return (checkError as NodeJS.ErrnoException).code === "ESRCH";
          }
        });

        if (staleRunningRenders.length > 0) {
          const now = new Date();
          await Promise.all(
            staleRunningRenders.map((render) =>
              updateRenderInHistory(render.id, {
                endTime: now,
                duration: Math.floor((now.getTime() - render.startTime.getTime()) / 1000),
                status: "terminated",
                error: undefined,
                pid: undefined,
              }),
            ),
          );

          renderHistory = await getRenderHistory();
        }

        if (isDisposed) return;

        setHistory(renderHistory);
        setIsLoading(false);

        const hasRunningRenders = renderHistory.some((render) => render.status === "running");
        timeout = setTimeout(loadHistory, hasRunningRenders ? 2000 : 15000);
      } catch (err) {
        if (isDisposed) return;

        setError(err instanceof Error ? err : new Error("Failed to load history"));
        setIsLoading(false);
        timeout = setTimeout(loadHistory, 15000);
      }
    }

    void loadHistory();

    return () => {
      isDisposed = true;
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load History",
        message: error.message,
      });
    }
  }, [error]);

  const stopRunningRender = async (render: RenderHistory) => {
    if (!render.pid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Stop Render",
        message: "Process ID not found",
      });
      return;
    }

    try {
      try {
        process.kill(render.pid, 0);
      } catch (checkError) {
        if ((checkError as NodeJS.ErrnoException).code === "ESRCH") {
          await updateRenderInHistory(render.id, {
            endTime: new Date(),
            duration: Math.floor((new Date().getTime() - render.startTime.getTime()) / 1000),
            status: "terminated",
            error: undefined,
            pid: undefined,
          });

          const renderHistory = await getRenderHistory();
          setHistory(renderHistory);

          await showToast({
            style: Toast.Style.Success,
            title: "Render Already Ended",
            message: "Status updated from running",
          });
          return;
        }
        throw checkError;
      }

      process.kill(render.pid, "SIGTERM");

      await updateRenderInHistory(render.id, {
        endTime: new Date(),
        duration: Math.floor((new Date().getTime() - render.startTime.getTime()) / 1000),
        status: "failed",
        error: "Stopped by user from queue",
        pid: undefined,
      });

      const renderHistory = await getRenderHistory();
      setHistory(renderHistory);

      await showToast({
        style: Toast.Style.Success,
        title: "Render Stopped",
        message: `Stopped rendering ${render.projectPath.split("/").pop()}`,
      });
    } catch (error) {
      const errorMessage =
        (error as NodeJS.ErrnoException).code === "ESRCH"
          ? "Process no longer exists"
          : (error as Error).message || "Unknown error";

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Stop Render",
        message: errorMessage,
      });
    }
  };

  const getStatusIcon = (status: RenderHistory["status"]) => {
    switch (status) {
      case "completed":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "running":
        return { source: Icon.Clock, tintColor: Color.Blue };
      case "failed":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "terminated":
        return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
      default: {
        const exhaustiveStatus: never = status;
        return exhaustiveStatus;
      }
    }
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getHistorySummary = (renders: RenderHistory[]): string => {
    const completedCount = renders.filter((render) => render.status === "completed").length;
    const runningCount = renders.filter((render) => render.status === "running").length;
    const failedCount = renders.filter((render) => render.status === "failed").length;
    const terminatedCount = renders.filter((render) => render.status === "terminated").length;

    return `${renders.length} total • ${completedCount} completed • ${runningCount} running • ${failedCount} failed • ${terminatedCount} ended`;
  };

  return (
    <List isLoading={isLoading} navigationTitle="Render History" searchBarPlaceholder="Search your renders...">
      {!history || history.length === 0 ? (
        <List.EmptyView
          title="No Renders Yet"
          description="Start your first render to begin tracking your render history! Head to 'Start Render' to get started."
          icon={Icon.Video}
        />
      ) : (
        <List.Section title="Render History" subtitle={getHistorySummary(history)}>
          {history.map((render) => {
            const projectName = render.projectPath.split("/").pop() || "Unknown";
            const subtitle = render.duration
              ? `${formatDuration(render.duration)} • ${getRelativeTime(render.startTime)}`
              : getRelativeTime(render.startTime);
            const accessories = [
              ...(render.totalFrames
                ? [
                    {
                      text: `${render.totalFrames} frames`,
                      icon: Icon.BarChart,
                    },
                  ]
                : []),
              {
                tag: {
                  value: render.status,
                  color:
                    render.status === "completed"
                      ? Color.Green
                      : render.status === "running"
                        ? Color.Blue
                        : render.status === "failed"
                          ? Color.Red
                          : Color.SecondaryText,
                },
              },
            ];

            return (
              <List.Item
                key={render.id}
                icon={getStatusIcon(render.status)}
                title={projectName}
                subtitle={subtitle}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.ShowInFinder title="Show Project in Finder" path={render.projectPath} />
                    {render.status === "running" && render.pid && (
                      <Action
                        title="Stop Render"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        onAction={() => stopRunningRender(render)}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                      />
                    )}
                    {render.status === "completed" && (
                      <Action
                        title="Open Output Folder"
                        icon={Icon.Folder}
                        onAction={async () => {
                          await open(dirname(render.projectPath));
                        }}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Project Path"
                      content={render.projectPath}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {render.error && (
                      <Action.CopyToClipboard
                        title="Copy Error"
                        content={render.error}
                        icon={Icon.ExclamationMark}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
