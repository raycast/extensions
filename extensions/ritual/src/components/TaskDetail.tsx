import { Color, Icon, List } from "@raycast/api";
import { deadlineLabel, deadlineUrgency } from "../api/dates";
import { taskMarkdown } from "../api/markdown";
import { tagColorHex } from "../api/tagColors";
import type { RitualTask } from "../api/types";
import { deadlineLeadDays } from "../preferences";

/// The inline panel Raycast shows beside the list when a row's detail is
/// toggled on — see `TaskList`'s `showingDetail` and `TaskActions`' "Show
/// Details" / "Hide Details" toggle. Namespaced under `List.Item.Detail`,
/// not `Detail`: this is a fragment rendered inside a row, not a pushed
/// screen.
/// `showEvening` is false exactly when the list is drawing an Evening section,
/// because then the section IS the answer and the field is repeating it. Both
/// are driven from the one `splitEvening` decision in `TaskList`, so the panel
/// and the divider can never disagree about which of them is carrying it.
export function TaskDetail({
  task,
  showEvening,
}: {
  task: RitualTask;
  showEvening: boolean;
}) {
  return (
    <List.Item.Detail
      markdown={taskMarkdown(task)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Project"
            text={task.project ?? "None"}
          />
          <List.Item.Detail.Metadata.Label
            title="Scheduled"
            text={task.scheduled ?? task.due ?? "None"}
          />
          {/* The raw date rides alongside the label — the row's flag is terse
              on purpose, but the panel has the room to be precise too, and it
              carries the same colour so the two never disagree about whether a
              deadline is upon you. `Color.Red` for a missed or approaching one,
              Raycast's default ink otherwise: passing `undefined` rather than
              a "normal" colour keeps it on PrimaryText, which is what every
              other label here uses. */}
          <List.Item.Detail.Metadata.Label
            title="Deadline"
            icon={
              task.deadline
                ? {
                    source: Icon.Flag,
                    tintColor:
                      deadlineUrgency(
                        task.deadline,
                        new Date(),
                        deadlineLeadDays(),
                      ) === "far"
                        ? Color.SecondaryText
                        : Color.Red,
                  }
                : undefined
            }
            text={
              task.deadline
                ? {
                    value: `${deadlineLabel(task.deadline)} (${task.deadline})`,
                    color:
                      deadlineUrgency(
                        task.deadline,
                        new Date(),
                        deadlineLeadDays(),
                      ) === "far"
                        ? undefined
                        : Color.Red,
                  }
                : "None"
            }
          />
          {/* "None" rather than a missing row, matching Project, Scheduled and
              Deadline above. A row that vanishes when empty makes the panel a
              different shape per task, so the eye has to re-find every field on
              each arrow-key press — and it leaves the reader unable to tell
              "no tags" from "tags didn't load". */}
          {task.tags?.length ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {task.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={tag}
                  text={tag}
                  color={tagColorHex(task.tagColors?.[tag])}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title="Tags" text="None" />
          )}
          {/* The count is a fallback for a CLI at schema 2 or below, which
              sends checklistDone/checklistTotal but no item titles. Once
              `checklist` is present, the body above already shows every
              item — a metadata count alongside it would be pure repetition,
              so it's shown only when there's no checklist to render instead. */}
          {!task.checklist?.length && task.checklistTotal ? (
            <List.Item.Detail.Metadata.Label
              title="Subtasks"
              text={`${task.checklistDone ?? 0}/${task.checklistTotal}`}
            />
          ) : null}
          {/* Gone entirely wherever the list draws an Evening section — Today.
              The divider already says which half a task is in, and the field
              said it again one column over. Kept in the scopes that have no
              divider (Upcoming, Inbox, All, Search), where it is the only place
              the fact appears at all. */}
          {showEvening ? (
            <List.Item.Detail.Metadata.Label
              title="Evening"
              text={task.evening ? "Yes" : "No"}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
