import { Action, ActionPanel, List, showToast, Toast, Icon, Color, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { getRenderHistory, RenderHistory, formatDuration, updateRenderInHistory } from "./utils/render-history";
import { dirname } from "node:path";

export default function RenderQueue() {
  const [history, setHistory] = useState<RenderHistory[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function loadHistory() {
      try {
        const renderHistory = await getRenderHistory();
        setHistory(renderHistory);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load history"));
        setIsLoading(false);
      }
    }

    loadHistory();

    const interval = setInterval(loadHistory, 2000);
    return () => clearInterval(interval);
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
            status: "failed",
            error: "Stopped by user from queue",
            pid: undefined,
          });

          const renderHistory = await getRenderHistory();
          setHistory(renderHistory);

          await showToast({
            style: Toast.Style.Success,
            title: "Render Stopped",
            message: "The render has been cancelled",
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

  const getEncouragingMessage = (totalRenders: number): string => {
    if (totalRenders === 0) return "No renders completed yet";
    if (totalRenders === 1) return "Your first render! Welcome aboard!";
    if (totalRenders < 5) return `${totalRenders} renders! You're getting the hang of it!`;
    if (totalRenders < 10) return `${totalRenders} renders! You're on a roll!`;
    if (totalRenders < 25) return `${totalRenders} renders! Incredible productivity!`;
    if (totalRenders < 50) return `${totalRenders} renders! You're on fire!`;
    if (totalRenders < 100) return `${totalRenders} renders! Legendary status!`;
    return `${totalRenders} renders! You're a rendering master!`;
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
        <List.Section
          title={`${history.filter((h) => h.status === "completed").length} Completed Renders`}
          subtitle={getEncouragingMessage(history.filter((h) => h.status === "completed").length)}
        >
          {history.map((render) => {
            const projectName = render.projectPath.split("/").pop() || "Unknown";
            const subtitle = render.duration
              ? `${formatDuration(render.duration)} • ${getRelativeTime(render.startTime)}`
              : getRelativeTime(render.startTime);

            return (
              <List.Item
                key={render.id}
                icon={getStatusIcon(render.status)}
                title={projectName}
                subtitle={subtitle}
                accessories={[
                  render.totalFrames
                    ? {
                        text: `${render.totalFrames} frames`,
                        icon: Icon.BarChart,
                      }
                    : {},
                  {
                    tag: {
                      value: render.status,
                      color:
                        render.status === "completed"
                          ? Color.Green
                          : render.status === "running"
                            ? Color.Blue
                            : Color.Red,
                    },
                  },
                ]}
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
