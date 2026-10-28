import React, { useEffect, useState, useRef } from "react";
import path from "path";
import { ActionPanel, Action, Toast, Icon, List, showInFinder, showToast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { cancelConversion, ConversionTask, convertVideo } from "../utils/ffmpeg";
import type { FormValues } from "../types";
import { CONVERSION_STATUS, LOADING_MESSAGES, ERROR_MESSAGES } from "../constants";

export default function Conversion({ values }: { values: FormValues }) {
  const [tasks, setTasks] = useState<ConversionTask[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasStartedConversion = useRef(false);

  useEffect(() => {
    if (hasStartedConversion.current) return;
    hasStartedConversion.current = true;

    const startConversion = async () => {
      try {
        setIsLoading(true);
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: LOADING_MESSAGES.INITIALIZING,
        });

        await convertVideo(values, (t) => {
          setTasks(t.map((x) => ({ ...x })));
          if (t.some((task) => task.status !== "queued")) {
            setIsLoading(false);
            toast.title = LOADING_MESSAGES.CONVERTING;
            toast.message = `${t.filter((task) => task.status === "done").length}/${t.length} files completed`;
          }
        });
      } catch (error) {
        showFailureToast(error, {
          title: ERROR_MESSAGES.CONVERSION_FAILED,
        });
      } finally {
        setIsLoading(false);
      }
    };

    startConversion();
  }, []);

  if (tasks.length === 0) return <List isLoading={isLoading} />;

  const isCompletedStatus = (
    status: (typeof CONVERSION_STATUS)[keyof typeof CONVERSION_STATUS],
  ): status is typeof CONVERSION_STATUS.DONE | typeof CONVERSION_STATUS.ERROR | typeof CONVERSION_STATUS.CANCELLED => {
    return [CONVERSION_STATUS.DONE, CONVERSION_STATUS.ERROR, CONVERSION_STATUS.CANCELLED].includes(
      status as typeof CONVERSION_STATUS.DONE | typeof CONVERSION_STATUS.ERROR | typeof CONVERSION_STATUS.CANCELLED,
    );
  };

  const completed = tasks.every((t) => isCompletedStatus(t.status));

  if (completed && !isCompleted) {
    setIsCompleted(true);
    showToast({
      title: tasks.every((t) => t.status === "done") ? "Conversion Completed" : "Conversion Finished",
      message: `${tasks.filter((t) => t.status === "done").length} of ${tasks.length} files converted.`,
      style: tasks.some((t) => t.status === "error") ? Toast.Style.Failure : Toast.Style.Success,
    });
  }

  const title = completed ? "Conversion Completed" : "Converting…";
  const subtitle = isLoading
    ? LOADING_MESSAGES.INITIALIZING
    : completed
      ? "All files processed"
      : `${tasks.filter((t) => t.status === CONVERSION_STATUS.DONE).length}/${tasks.length} files completed`;

  return (
    <List navigationTitle={title} isLoading={isLoading}>
      <List.Section
        title={completed ? "✅ Conversion Complete" : "⚠️ Do not close this window while converting"}
        subtitle={subtitle}
      >
        {tasks.map((t) => {
          const isDone = t.status === CONVERSION_STATUS.DONE;
          const percent = isDone ? `Completed in ${formatElapsed(t.elapsed)}` : `${t.progress}%`;

          const subtitle = {
            [CONVERSION_STATUS.DONE]: t.warning ? "Done — original retained" : "Done",
            [CONVERSION_STATUS.ERROR]: "Error",
            [CONVERSION_STATUS.CONVERTING]:
              values.videoFormat === "gif" ? "Encoding GIF…" : `Converting... ${t.fps} fps`,
            [CONVERSION_STATUS.QUEUED]: "Queued",
            [CONVERSION_STATUS.CANCELLED]: "Cancelled",
          };

          const icons = {
            [CONVERSION_STATUS.DONE]: Icon.Checkmark,
            [CONVERSION_STATUS.ERROR]: Icon.XMarkCircle,
            [CONVERSION_STATUS.CONVERTING]: Icon.CircleProgress,
            [CONVERSION_STATUS.QUEUED]: Icon.Clock,
            [CONVERSION_STATUS.CANCELLED]: Icon.XMarkCircle,
          };

          return (
            <List.Item
              key={t.id}
              title={path.basename(t.file)}
              subtitle={subtitle[t.status]}
              icon={icons[t.status]}
              accessories={[{ text: percent }, ...(t.warning ? [{ icon: Icon.Warning, tooltip: t.warning }] : [])]}
              actions={
                <ActionPanel>
                  <Action
                    title={process.platform === "win32" ? "Open Containing Folder" : "Show in Finder"}
                    onAction={() =>
                      process.platform === "win32"
                        ? open(path.dirname(t.status === "done" ? t.outputFile || t.file : t.file))
                        : showInFinder(t.status === "done" ? t.outputFile || t.file : t.file)
                    }
                    icon={Icon.Folder}
                  />
                  {!completed && (
                    <Action
                      title="Cancel Conversion"
                      onAction={() => cancelConversion()}
                      shortcut={{ modifiers: ["cmd"], key: "x" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function formatElapsed(seconds: number | undefined): string {
  if (!seconds) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}
