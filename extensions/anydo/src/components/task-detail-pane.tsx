import { Color, Icon, List } from "@raycast/api";

import { formatDueUi, relativeLabel } from "../anydo/dates";
import { dueDate } from "../anydo/format";
import { t } from "../anydo/i18n";
import { listTitleOf } from "../anydo/match";
import { subtasksInPane } from "../anydo/prefs";
import { useSubtasks } from "../anydo/subtask-cache";
import { parseNote, priorityLabel } from "../anydo/tags";
import { strike } from "../anydo/text";
import type { AnyDoList, AnyDoTask } from "../anydo/types";

function priorityIcon(
  priority: number,
): { source: Icon; tintColor: Color } | undefined {
  if (priority === 3)
    return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (priority === 2) return { source: Icon.ArrowUp, tintColor: Color.Orange };
  if (priority === 1) return { source: Icon.ArrowDown, tintColor: Color.Blue };
  return undefined;
}

const TAG_COLORS: Color.ColorLike[] = [
  Color.Purple,
  Color.Blue,
  Color.Green,
  Color.Orange,
  Color.Magenta,
];

/**
 * The right-hand panel of the two-pane list: a compact metadata block (nothing gets cut off in a
 * narrow pane) plus the note and the subtask checklist.
 */
export function TaskDetailPane({
  task,
  lists,
  now = new Date(),
}: {
  task: AnyDoTask;
  lists: AnyDoList[];
  now?: Date;
}) {
  const meta = parseNote(task.note);
  const due = dueDate(task);
  const listTitle = listTitleOf(lists, task.list_id);
  const done = task.status !== "unchecked";
  const subtasks = subtasksInPane() ? useSubtasks(task.task_id) : undefined;

  const overdue = Boolean(due && due.getTime() < now.getTime());
  const dueColor = overdue
    ? Color.Red
    : due
      ? Color.Green
      : Color.SecondaryText;
  const doneCount =
    subtasks?.filter((item) => item.status === "checked").length ?? 0;

  const markdown = [
    `# ${done ? strike(task.title) : task.title}`,
    done
      ? `🔴 **${t("به اتمام رسیده", "Completed")}**`
      : `🟢 **${t("باز", "Open")}**${meta.priority === 3 ? ` · 🔥 ${t("سنجاق‌شده", "Pinned")}` : ""}`,
    meta.text ? `> ${meta.text}` : "",
    subtasks && subtasks.length > 0
      ? [
          `### ${t("زیرتسک‌ها", "Subtasks")} — ${doneCount}/${subtasks.length}`,
          ...subtasks.map(
            (item) =>
              `- ${item.status === "checked" ? "✅" : "⬜"} ${
                item.status === "checked" ? strike(item.title) : item.title
              }`,
          ),
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title={`📁 ${t("لیست", "List")}`}
            text={listTitle}
            icon={Icon.Folder}
          />
          <List.Item.Detail.Metadata.Label
            title={`📅 ${t("سررسید", "Due")}`}
            text={
              due
                ? formatDueUi(due, Boolean(task.datetime))
                : t("بدون تاریخ", "no date")
            }
            icon={{ source: Icon.Calendar, tintColor: dueColor }}
          />
          <List.Item.Detail.Metadata.Label
            title={`⏳ ${t("زمان", "Time left")}`}
            text={due ? relativeLabel(due, now) : "—"}
            icon={{ source: Icon.Clock, tintColor: dueColor }}
          />
          <List.Item.Detail.Metadata.Label
            title={`🚩 ${t("اولویت", "Priority")}`}
            text={priorityLabel(meta.priority)}
            icon={priorityIcon(meta.priority)}
          />
          <List.Item.Detail.Metadata.TagList
            title={`🏷 ${t("برچسب‌ها", "Tags")}`}
          >
            {meta.tags.length > 0 ? (
              meta.tags.map((tag, index) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={tag}
                  text={`#${tag}`}
                  color={TAG_COLORS[index % TAG_COLORS.length]}
                />
              ))
            ) : (
              <List.Item.Detail.Metadata.TagList.Item
                text={t("بدون برچسب", "no tags")}
                color={Color.SecondaryText}
              />
            )}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title={`📊 ${t("وضعیت", "Status")}`}
            text={done ? `🔴 ${t("بسته", "Closed")}` : `🟢 ${t("باز", "Open")}`}
          />
          {subtasks && subtasks.length > 0 ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={`✅ ${t("زیرتسک‌ها", "Subtasks")}`}
                text={`${doneCount}/${subtasks.length}`}
              />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
