import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the filter to update
   */
  id: string;
  /**
   * The new name for the filter
   */
  name?: string;
  /**
   * The new query for the filter. Supports advanced filtering with various operators and keywords.
   *
   * BASIC OPERATORS:
   * - | (OR): "today | overdue"
   * - & (AND): "today & p1"
   * - ! (NOT): "!subtask"
   * - () (Grouping): "(today | overdue) & #Work"
   * - , (Separate lists): "date: yesterday, today"
   * - \ (Escape special chars): "#One \& Two"
   *
   * DATE FILTERS:
   * - Specific dates:
   *   "date: Jan 3" - Tasks for January 3rd
   *   "date before: May 5" - Tasks before May 5th
   *   "date after: May 5" - Tasks after May 5th
   * - Relative dates:
   *   "date before: +4 hours" - Tasks due within next 4 hours plus overdue
   *   "5 days" or "next 5 days" - Tasks in next 5 days
   * - Special date filters:
   *   "no date" - Tasks without dates
   *   "!no time" - Tasks with specific times
   *   "recurring" - Recurring tasks
   *
   * PRIORITY FILTERS:
   * - "p1" - Priority 1 (highest)
   * - "p2" - Priority 2
   * - "p3" - Priority 3
   * - "no priority" - No priority set (p4)
   *
   * ORGANIZATION FILTERS:
   * Labels:
   * - "@email" - Tasks with email label
   * - "no labels" - Tasks without any labels
   * - "@home*" - Tasks with labels starting with "home"
   *
   * Projects:
   * - "#Work" - Tasks in Work project
   * - "##Work" - Tasks in Work project and its sub-projects
   * - "##School & !#Science" - School project tasks excluding Science
   *
   * Sections:
   * - "/Meetings" - Tasks in any Meetings section
   * - "#Work & /Meetings" - Tasks in Work project's Meetings section
   * - "!/*" - Tasks not in any section
   *
   * Workspaces:
   * - "workspace: My projects" - Tasks in My Projects workspace
   *
   * TASK PROPERTIES:
   * - Search: "search: Meeting"
   * - Creation: "created: today"
   * - Subtasks: "subtask" or "!subtask"
   *
   * ASSIGNMENT FILTERS:
   * - "assigned to: others" - Tasks assigned to others
   * - "assigned by: me" - Tasks you assigned
   * - "shared" - Tasks in shared projects
   *
   * COMPLEX EXAMPLES:
   * - "(today | overdue) & #Work" - Today's or overdue Work tasks
   * - "7 days & @waiting" - Next week's waiting tasks
   * - "#Inbox & no date" - Undated Inbox tasks
   * - "@urgent* & ##Work" - Work tasks with urgent-like labels
   */
  query?: string;
  /**
   * The color of the filter icon. Available colors:
   * - berry_red (#B8255F)
   * - red (#DC4C3E)
   * - orange (#C77100)
   * - yellow (#B29104)
   * - olive_green (#949C31)
   * - lime_green (#65A33A)
   * - green (#369307)
   * - mint_green (#42A393)
   * - teal (#148FAD)
   * - sky_blue (#319DC0)
   * - light_blue (#6988A4)
   * - blue (#4180FF)
   * - grape (#692EC2)
   * - violet (#CA3FEE)
   * - lavender (#A4698C)
   * - magenta (#65A33A)
   * - salmon (#C9766F)
   * - charcoal (#808080)
   * - grey (#999999)
   */
  color?: string;
  /**
   * Filter's order in the filter list (the smallest value should place the filter at the top)
   */
  item_order?: number;
  /**
   * Whether the filter is a favorite
   */
  is_favorite?: boolean;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["filters"],
    commands: [
      {
        type: "filter_update",
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id, name, query }: Input) => {
  const { filters } = await syncRequest({
    sync_token,
    resource_types: ["filters"],
  });

  const filter = filters.find((f) => f.id === id);
  const info = [{ name: "Filter", value: filter?.name }];

  if (name) {
    info.push({ name: "New Name", value: name });
  }
  if (query) {
    info.push({ name: "New Query", value: query });
  }

  return { info };
});
