import type { Assignment, AssignmentFilter, AssignmentGroup } from "../api/classroom";
import { ASSIGNMENT_GROUPS, getAssignmentGroup, matchesFilter, newestFirst } from "../api/classroom";

export const GROUP_TITLES: Record<AssignmentGroup, string> = {
  missing: "Missing",
  dueSoon: "Due Soon",
  dueLater: "Due Later",
  noDueDate: "No Due Date",
  done: "Done",
};
export type Settings = {
  groupAssignments: boolean;
  groupOrder: AssignmentGroup[];
  searchTeachers: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  groupAssignments: true,
  groupOrder: [...ASSIGNMENT_GROUPS],
  searchTeachers: false,
};
export function normalizeSettings(value?: Partial<Settings>): Settings {
  const order = [...new Set((value?.groupOrder ?? []).filter((group) => ASSIGNMENT_GROUPS.includes(group)))];
  return {
    groupAssignments: value?.groupAssignments ?? true,
    groupOrder: [...order, ...ASSIGNMENT_GROUPS.filter((group) => !order.includes(group))],
    searchTeachers: value?.searchTeachers ?? false,
  };
}
export function assignmentSections(data: Assignment[], filter: AssignmentFilter, settings: Settings, now = Date.now()) {
  const items = data.filter((item) => matchesFilter(item, filter, now));
  // An ungrouped list has one predictable global ordering: most recently updated first.
  if (filter === "all" && !settings.groupAssignments) {
    return [
      {
        key: "all",
        title: undefined,
        items: [...items].sort((a, b) => newestFirst(a, b) || a.id.localeCompare(b.id)),
      },
    ];
  }
  const due = (item: Assignment) => (item.dueDate ? Date.parse(item.dueDate) : 0);
  return settings.groupOrder
    .map((group) => ({
      key: group,
      title: GROUP_TITLES[group],
      items: items
        .filter((item) => getAssignmentGroup(item, now) === group)
        .sort(
          (a, b) =>
            (group === "dueSoon" || group === "dueLater" ? due(a) - due(b) : due(b) - due(a)) || newestFirst(a, b),
        ),
    }))
    .filter((section) => section.items.length > 0);
}
