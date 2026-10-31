import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  confirmAlert,
  open,
} from "@raycast/api";

import { makeClient } from "../anydo/auth";
import { formatDueUi, isoDay, relativeLabel } from "../anydo/dates";
import { dueDate } from "../anydo/format";
import {
  clearCompleted,
  removeFromHistory,
  verifyCompleted,
} from "../anydo/history";
import { t } from "../anydo/i18n";
import { toPersianDigits } from "../anydo/jalali";
import { listTitleOf } from "../anydo/match";
import { strike } from "../anydo/text";
import type { AnyDoList, AnyDoTask } from "../anydo/types";
import { runWithToast } from "./feedback";
import { useAsync } from "./use-async";

/**
 * Completed tasks as list sections (rendered inside the main page).
 * Any.do's API cannot list completed personal tasks, so they are re-read by id from the
 * extension's own completion log — that is also what makes "reopen" possible at all.
 */
export function CompletedSection({
  lists,
  onChanged,
}: {
  lists: AnyDoList[];
  onChanged: () => void;
}) {
  const { data, isLoading, revalidate } = useAsync(async () =>
    verifyCompleted(makeClient(), 80),
  );

  const entries = data?.entries ?? [];
  const tasks = data?.tasks ?? [];
  const completedAt = new Map(entries.map((entry) => [entry.id, entry.at]));

  async function reopen(task: AnyDoTask) {
    await runWithToast(
      t("به حالت باز برگشت", "Task reopened"),
      async () => {
        await makeClient().setStatus(task, "unchecked");
        await removeFromHistory(task.task_id);
      },
      () => {
        revalidate();
        onChanged();
      },
    );
  }

  async function forget(task: AnyDoTask) {
    const confirmed = await confirmAlert({
      title: t("از تاریخچه حذف شود؟", "Remove from local history?"),
      message: t(
        "فقط از فهرست «انجام‌شده‌ها» در این اکستنشن پاک می‌شود؛ خود تسک در Any.do دست‌نخورده می‌ماند.",
        "Only this extension's list is affected; the task in Any.do stays as it is.",
      ),
      icon: Icon.Trash,
      primaryAction: {
        title: t("حذف", "Remove"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await removeFromHistory(task.task_id);
    revalidate();
  }

  async function clearAll() {
    const confirmed = await confirmAlert({
      title: t("کل تاریخچه پاک شود؟", "Clear the whole history?"),
      message: t(
        "فقط فهرست محلی پاک می‌شود.",
        "Only the local list is cleared.",
      ),
      icon: Icon.Trash,
      primaryAction: {
        title: t("پاک کن", "Clear"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await clearCompleted();
    revalidate();
  }

  if (!isLoading && tasks.length === 0) {
    return (
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={t(
          "هنوز چیزی از این اکستنشن انجام نشده",
          "Nothing completed through this extension yet",
        )}
        description={t(
          "تسک‌هایی که با این اکستنشن «انجام شد» می‌شوند اینجا فهرست می‌شوند تا هر وقت خواستی برشان گردانی. تسک‌های انجام‌شده در خود اپ Any.do از طریق API قابل فهرست‌شدن نیستند.",
          "Tasks completed through this extension are listed here so you can reopen them. Tasks completed inside Any.do itself cannot be listed by the API.",
        )}
        actions={
          <ActionPanel>
            <Action
              title={t("تازه‌سازی", "Refresh")}
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <>
      <List.Section
        title={t(
          "انجام‌شده‌ها (از این اکستنشن)",
          "Completed (via this extension)",
        )}
        subtitle={toPersianDigits(tasks.length)}
      >
        {tasks.map((task) => {
          const at = completedAt.get(task.task_id);
          const due = dueDate(task);
          return (
            <List.Item
              key={task.task_id}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Red }}
              title={{ value: strike(task.title), tooltip: task.title }}
              subtitle={
                at
                  ? `${t("انجام شده", "completed")} ${relativeLabel(new Date(at))}`
                  : undefined
              }
              accessories={[
                {
                  tag: {
                    value: t("به اتمام رسیده", "Completed"),
                    color: Color.Red,
                  },
                },
                {
                  tag: {
                    value: listTitleOf(lists, task.list_id),
                    color: Color.Blue,
                  },
                },
                ...(due
                  ? [{ text: formatDueUi(due, Boolean(task.datetime)) }]
                  : []),
                ...(at ? [{ text: isoDay(new Date(at)) }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={t("بازگرداندن به انجام‌نشده", "Reopen task")}
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() => reopen(task)}
                  />
                  <Action
                    title={t("حذف از تاریخچه", "Remove from history")}
                    icon={Icon.Trash}
                    onAction={() => forget(task)}
                  />
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
                  <Action
                    title={t("پاک کردن کل تاریخچه", "Clear all history")}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={clearAll}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </>
  );
}
