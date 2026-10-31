import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

import { showToastNotification } from "../anydo/alarm";
import { makeClient } from "../anydo/auth";
import { formatDueUi } from "../anydo/dates";
import { dueDate } from "../anydo/format";
import { recordCompleted } from "../anydo/history";
import { t } from "../anydo/i18n";
import { toPersianDigits } from "../anydo/jalali";
import { pomodoroMinutes } from "../anydo/prefs";
import type { AnyDoTask } from "../anydo/types";
import { runWithToast } from "./feedback";

function mmss(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Pomodoro-style focus session on a single task. */
export function FocusView({
  task,
  onDone,
}: {
  task: AnyDoTask;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  const sessionSeconds = pomodoroMinutes() * 60;
  const [left, setLeft] = useState(sessionSeconds);
  const [running, setRunning] = useState(true);
  const due = dueDate(task);

  const active = running && left > 0;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(
      () => setLeft((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (left === 0 && running) {
      setRunning(false);
      void showToastNotification(
        t("⏰ زمان تمرکز تمام شد", "⏰ Focus session finished"),
        task.title,
      );
    }
  }, [left, running, task.title]);

  const progress = Math.round(((sessionSeconds - left) / sessionSeconds) * 100);
  const filled = Math.round((progress / 100) * 20);

  const markdown = [
    `# ${task.title}`,
    `## ${toPersianDigits(mmss(left))}`,
    `\`${"█".repeat(filled)}${"░".repeat(20 - filled)}\` ${toPersianDigits(progress)}٪`,
    due
      ? `**${t("سررسید", "Due")}:** ${formatDueUi(due, Boolean(task.datetime))}`
      : "",
    task.note ? `> ${task.note}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  async function complete() {
    const ok = await runWithToast(
      t("تسک انجام شد", "Task completed"),
      async () => {
        await makeClient().setStatus(task, "checked");
        await recordCompleted(task);
      },
      onDone,
    );
    if (ok) await pop();
  }

  return (
    <Detail
      navigationTitle={t("حالت تمرکز", "Focus mode")}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={active ? t("توقف", "Pause") : t("ادامه", "Resume")}
            icon={active ? Icon.Pause : Icon.Play}
            onAction={() => setRunning((value) => !value)}
          />
          <Action
            title={t("۵ دقیقه بیشتر", "+5 minutes")}
            icon={Icon.Plus}
            onAction={() => setLeft((value) => value + 300)}
          />
          <Action
            title={t("شروع دوباره", "Restart")}
            icon={Icon.ArrowClockwise}
            onAction={() => setLeft(sessionSeconds)}
          />
          <Action
            title={t("انجام شد", "Mark as done")}
            icon={Icon.CheckCircle}
            onAction={complete}
          />
          <Action
            title={t("بازگشت", "Back")}
            icon={Icon.ArrowLeft}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}
