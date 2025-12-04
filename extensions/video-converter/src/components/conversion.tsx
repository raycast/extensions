import React, { useEffect, useState, useRef } from "react";
import path from "path";
import { ActionPanel, Action, Toast, Icon, List, showInFinder, showToast } from "@raycast/api";
import { getProgressIcon, showFailureToast } from "@raycast/utils";
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
        showToast({
          style: Toast.Style.Animated,
          title: LOADING_MESSAGES.INITIALIZING,
        });

        await convertVideo(values, (t) => {
          setTasks(t.map((x) => ({ ...x })));
        });
        setIsLoading(false);
      } catch (error) {
        showFailureToast(error, {
          title: ERROR_MESSAGES.CONVERSION_FAILED,
        });
      }
    };

    startConversion();
  }, []);

  if (tasks.length === 0) return null;

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
      title: "Conversion Completed",
      message: `All ${tasks.length} files have been converted.`,
      style: Toast.Style.Success,
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
            [CONVERSION_STATUS.DONE]: "Done",
            [CONVERSION_STATUS.ERROR]: "Error",
            [CONVERSION_STATUS.CONVERTING]: `Converting... ${t.fps} fps`,
            [CONVERSION_STATUS.QUEUED]: "Queued",
            [CONVERSION_STATUS.CANCELLED]: "Cancelled",
          };

          const icons = {
            [CONVERSION_STATUS.DONE]: Icon.Checkmark,
            [CONVERSION_STATUS.ERROR]: Icon.XMarkCircle,
            [CONVERSION_STATUS.CONVERTING]: getProgressIcon(t.progress / 100),
            [CONVERSION_STATUS.QUEUED]: Icon.Clock,
            [CONVERSION_STATUS.CANCELLED]: Icon.XMarkCircle,
          };

          return (
            <List.Item
              key={t.id}
              title={path.basename(t.file)}
              subtitle={subtitle[t.status]}
              icon={icons[t.status]}
              accessories={[{ text: percent }]}
              actions={
                <ActionPanel>
                  <Action title="Show in Finder" onAction={() => showInFinder(t.file)} icon={Icon.Finder} />
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
