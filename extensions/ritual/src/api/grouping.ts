import type { RitualTask } from "./types";

/// Rows keep the CLI's order; `group` (present only in the upcoming scope)
/// becomes a section heading. A list with no groups yields one untitled
/// section, which renders exactly as a flat list.
///
/// This assumes the CLI emits rows already contiguous by group — the same
/// label never appears in two separate runs. If it ever regresses on that,
/// the symptom here is a repeated section rather than a merged one; the test
/// for alternating labels below documents and pins that requirement.
///
/// `splitEvening` adds Today's divider: the app draws a NIGHT rule across
/// Today and puts evening work beneath it, and this is the same idea in the
/// only structure Raycast offers, a `List.Section`. It applies ONLY to rows the
/// CLI did not group — Upcoming's sections are weeks, and halving each of them
/// by time of day would say something the app never says.
export function groupTasks(
  tasks: RitualTask[],
  options: { splitEvening?: boolean } = {},
): [string | undefined, RitualTask[]][] {
  if (options.splitEvening && tasks.every((task) => task.group === undefined)) {
    const day = tasks.filter((task) => !task.evening);
    const evening = tasks.filter((task) => task.evening);
    const sections: [string | undefined, RitualTask[]][] = [];
    // Evening LAST regardless of the order rows arrived in, and each heading
    // omitted when its half is empty — an "Evening" rule over nothing, or an
    // empty stretch above it, would both be furniture rather than information.
    if (day.length) sections.push([undefined, day]);
    if (evening.length) sections.push(["Evening", evening]);
    return sections;
  }

  const sections: [string | undefined, RitualTask[]][] = [];
  for (const task of tasks) {
    const last = sections[sections.length - 1];
    if (last && last[0] === task.group) last[1].push(task);
    else sections.push([task.group, [task]]);
  }
  return sections;
}
