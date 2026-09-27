import { Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { RitualTask } from "../api/types";
import {
  deadlineCount,
  deadlineLabel,
  deadlineUrgency,
  parseDay,
} from "../api/dates";
import { tagColorHex } from "../api/tagColors";
import { deadlineLeadDays } from "../preferences";

/// One row. Accessories run least-to-most urgent left to right, so the eye
/// lands on the deadline last, nearest the edge.
///
/// ALL BUT ONE ARE DROPPED WHILE THE DETAIL PANEL IS OPEN, and the note that
/// used to sit here said Raycast did that for us. It does not: with the panel
/// up, Raycast renders the row's accessories inside a list column roughly 40%
/// of the window, and dates and tags then squeeze the title down to
/// "Courser…" / "Renew passp…". The panel already shows Project, Scheduled,
/// Deadline, Tags and Evening in full, so every one of those accessories was
/// costing the title width to repeat what was on screen beside it. There is no
/// API for the list/detail split ratio — what the row spends on itself is the
/// only lever, so with the panel open it spends almost everything on the title.
///
/// The exception is a MISSED DEADLINE. Everything else the panel repeats is
/// reference — which project, which day — and you read it once you have landed
/// on the row. A blown deadline is the only thing you need to see on a row you
/// have NOT landed on, because it is what makes you land there. It is also the
/// app's only "overdue" idea (SharedAssets/DueLabel.swift), so a red tag here
/// means what the red badge means on the phone.
///
/// `subtitle` follows the same logic: nothing beside the title while the panel
/// is up, and with the panel down it carries the task's own words (notes),
/// falling back to the project. The project is not lost in that case — it moves
/// to an accessory.
export function TaskListItem({
  task,
  actions,
  detail,
  showingDetail,
}: {
  task: RitualTask;
  actions: ReactNode;
  detail: ReactNode;
  showingDetail: boolean;
}) {
  /// The first line of the notes, trimmed to a row's worth. Markdown headings
  /// and bullets are stripped of their leading punctuation — "- milk" reads as
  /// debris on one line, where the detail panel renders it as a real list.
  const noteSummary = (() => {
    const first = task.notes
      ?.split("\n")
      .map((line) => line.replace(/^\s*(?:[#>*-]+\s*)?/, "").trim())
      .find((line) => line.length > 0);
    if (!first) return undefined;
    return first.length > 80 ? `${first.slice(0, 79)}…` : first;
  })();

  /// The one accessory worth a row's width in either state — see the note
  /// above on why this and nothing else survives the detail panel.
  ///
  /// A FLAG AND A NUMBER, not the sentence. "In 99+ days" and "6 days ago" are
  /// six and eleven characters of a narrow column spent on words the panel
  /// beside it already spells out in full, and they were what pushed "Coursera
  /// NeuroAI…" and "Renew passport" back into ellipsis after the accessories
  /// were otherwise cleared. The glyph says "deadline", the integer says how
  /// far, its sign says which side of it you are on, and the tooltip restores
  /// the sentence on hover for anyone who wants it.
  ///
  /// Colour is reserved for deadlines that are actually upon you — inside the
  /// app's own lead window, or already missed. A deadline three months out is
  /// information, not an alarm, and a list where every flag is red is a list
  /// where none of them is.
  const deadline = (() => {
    if (!task.deadline || task.deadline === task.scheduled) return undefined;
    const urgency = deadlineUrgency(
      task.deadline,
      new Date(),
      deadlineLeadDays(),
    );
    const color = urgency === "far" ? Color.SecondaryText : Color.Red;
    return {
      icon: { source: Icon.Flag, tintColor: color },
      text: { value: deadlineCount(task.deadline), color },
      tooltip: `Deadline: ${deadlineLabel(task.deadline)} (${task.deadline})`,
    } satisfies List.Item.Accessory;
  })();

  if (showingDetail) {
    return (
      <List.Item
        icon={
          task.completed
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : Icon.Circle
        }
        title={task.title}
        accessories={deadline ? [deadline] : undefined}
        detail={detail}
        actions={actions}
      />
    );
  }

  const accessories: List.Item.Accessory[] = [];
  // Only when the subtitle is showing notes instead — otherwise the row would
  // name its project twice.
  if (noteSummary && task.project) {
    accessories.push({ text: task.project, icon: Icon.Folder });
  }
  if (task.checklistTotal) {
    accessories.push({
      text: `${task.checklistDone ?? 0}/${task.checklistTotal}`,
      icon: Icon.CheckList,
    });
  }
  // Raycast draws the tag's chrome itself (no corner-radius control), so
  // colour is the only lever the row has to make tags stand out — resolved
  // from Ritual's own stored token via `tagColorHex`, `undefined` (Raycast's
  // default) for an uncoloured or unrecognised token.
  for (const tag of task.tags ?? [])
    accessories.push({
      tag: { value: tag, color: tagColorHex(task.tagColors?.[tag]) },
    });
  if (task.evening)
    accessories.push({ icon: Icon.Moon, tooltip: "This Evening" });
  // `task.overdue` is deliberately NOT rendered. RitualKit's `isOverdue` is
  // `scheduledDate < today` (falling back to the deadline), so it fires on any
  // task that simply rolled over from yesterday — which in Today is most of
  // them. The app never calls it: a non-today start date gets a neutral accent
  // "m/d" chip, past or future (TaskAccordionRow+DueLabel.swift), and nothing
  // warns. Rendering it as an orange tag tarred every rolled-over task as late.
  if (deadline) accessories.push(deadline);

  // Add scheduled/due date if not today. Use local date components for comparison
  // to avoid UTC shifts. Show what isn't already implied: Today doesn't show its
  // date, but Upcoming, Inbox, All, and Search do.
  const dateStr = task.scheduled ?? task.due;
  if (dateStr) {
    const taskDate = parseDay(dateStr);
    const today = new Date();
    const isToday =
      taskDate.getFullYear() === today.getFullYear() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getDate() === today.getDate();
    if (!isToday) {
      accessories.push({ date: taskDate });
    }
  }

  return (
    <List.Item
      icon={
        task.completed
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : Icon.Circle
      }
      title={task.title}
      // The task's own words first — "I don't see the description" was the
      // complaint, and the project was occupying the only line that could
      // carry one.
      subtitle={noteSummary ?? task.project}
      accessories={accessories}
      detail={detail}
      actions={actions}
    />
  );
}
