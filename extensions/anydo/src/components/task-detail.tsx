import { Action, ActionPanel, Color, Detail, Icon, open } from "@raycast/api";

import { makeClient } from "../anydo/auth";
import { formatDueUi, relativeLabel } from "../anydo/dates";
import {
  dueDate,
  reminderLabel,
  reminderOptions,
  toLocalIso,
} from "../anydo/format";
import { recordCompleted } from "../anydo/history";
import { t } from "../anydo/i18n";
import { toPersianDigits } from "../anydo/jalali";
import { isOverdue, listTitleOf } from "../anydo/match";
import type { AnyDoList, AnyDoTask } from "../anydo/types";
import { runWithToast } from "./feedback";
import { FocusView } from "./focus";
import { useAsync } from "./use-async";

/** Detail view for a single task: note, subtasks, reminders, focus session. */
export function TaskDetail({
  task,
  lists,
  onChanged,
}: {
  task: AnyDoTask;
  lists: AnyDoList[];
  onChanged: () => void;
}) {
  const {
    data: subtasks,
    isLoading,
    revalidate,
  } = useAsync(() => makeClient().getSubtasks(task));
  const due = dueDate(task);
  const overdue = isOverdue(task);
  const total = (subtasks ?? []).length;
  const done = (subtasks ?? []).filter(
    (subtask) => subtask.status === "checked",
  ).length;

  const markdown = [
    `# ${task.title}`,
    task.note ? `> ${task.note}` : "",
    "---",
    `**${t("لیست", "List")}:** ${listTitleOf(lists, task.list_id)}`,
    `**${t("سررسید", "Due")}:** ${due ? formatDueUi(due, Boolean(task.datetime)) : t("بدون تاریخ", "no date")}`,
    due
      ? `**${t("زمان باقی‌مانده", "Remaining")}:** ${relativeLabel(due)}`
      : "",
    total > 0
      ? `**${t("سابتسک‌ها", "Subtasks")}:** ${toPersianDigits(done)} / ${toPersianDigits(total)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  async function complete() {
    await runWithToast(
      t("انجام شد", "Completed"),
      async () => {
        await makeClient().setStatus(task, "checked");
        await recordCompleted(task);
      },
      () => {
        onChanged();
        revalidate();
      },
    );
  }

  async function toggleSubtask(subtaskId: string, checked: boolean) {
    await runWithToast(
      checked
        ? t("سابتسک انجام شد", "Subtask done")
        : t("سابتسک باز شد", "Subtask reopened"),
      () =>
        makeClient().updateSubtask(task, subtaskId, {
          status: checked ? "checked" : "unchecked",
        }),
    );
    revalidate();
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={task.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={t("لیست", "List")}
            text={listTitleOf(lists, task.list_id)}
            icon={Icon.Folder}
          />
          {due ? (
            <Detail.Metadata.Label
              title={t("سررسید", "Due")}
              text={formatDueUi(due, Boolean(task.datetime))}
              icon={{
                source: overdue ? Icon.ExclamationMark : Icon.Calendar,
                tintColor: overdue ? Color.Red : Color.Green,
              }}
            />
          ) : (
            <Detail.Metadata.Label
              title={t("سررسید", "Due")}
              text={t("بدون تاریخ", "no date")}
              icon={Icon.Minus}
            />
          )}
          {total > 0 ? <Detail.Metadata.Separator /> : null}
          {(subtasks ?? []).map((subtask) => (
            <Detail.Metadata.Label
              key={subtask.subtask_id}
              title={subtask.status === "checked" ? "✓" : "◻"}
              text={subtask.title}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={t("انجام شد", "Mark as done")}
              icon={Icon.CheckCircle}
              onAction={complete}
            />
            <Action.Push
              title={t("شروع تمرکز", "Start focus session")}
              icon={Icon.Clock}
              target={<FocusView task={task} onDone={onChanged} />}
            />
            {(subtasks ?? []).map((subtask) => (
              <Action
                key={subtask.subtask_id}
                title={`${subtask.status === "checked" ? t("باز کردن", "Reopen") : t("انجام", "Complete")} · ${subtask.title}`}
                icon={
                  subtask.status === "checked" ? Icon.Circle : Icon.CheckCircle
                }
                onAction={() =>
                  toggleSubtask(
                    subtask.subtask_id,
                    subtask.status !== "checked",
                  )
                }
              />
            ))}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <ActionPanel.Submenu
              title={t("یادآور", "Reminder")}
              icon={Icon.Bell}
            >
              {reminderOptions(due)
                .filter((option) => option.date !== null)
                .map((option) => (
                  <Action
                    key={option.title}
                    title={option.title}
                    onAction={() =>
                      runWithToast(
                        `${t("یادآور", "Reminder")}: ${reminderLabel(option.date as Date)}`,
                        () =>
                          makeClient().setReminder(
                            task,
                            toLocalIso(option.date as Date),
                          ),
                      )
                    }
                  />
                ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={t("باز کردن Any.do", "Open Any.do")}
              icon={Icon.Globe}
              onAction={() => open("https://app.any.do/")}
            />
            <Action.CopyToClipboard
              title={t("کپی عنوان", "Copy title")}
              content={task.title}
            />
            <Action
              title={t("تازه‌سازی", "Refresh")}
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
