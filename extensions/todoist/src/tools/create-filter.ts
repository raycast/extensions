import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The name of the filter
   */
  name: string;
  /**
   * The query to search for. Supports advanced filtering with various operators and keywords.
   *
   * BASIC OPERATORS:
   * - | (OR): Combines queries where either can match
   *   "today | overdue" - Tasks due today or overdue
   * - & (AND): Requires both conditions to match
   *   "today & p1" - Priority 1 tasks due today
   * - ! (NOT): Excludes matching tasks
   *   "!subtask" - Exclude subtasks
   * - () (Grouping): Processes queries inside first
   *   "(today | overdue) & #Work" - Today's or overdue tasks in Work project
   * - , (Separate lists): Shows queries in different lists
   *   "date: yesterday, today" - Yesterday's tasks, followed by today's
   * - \ (Escape special chars): Use special characters literally
   *   "#One \& Two" - Project named "One & Two"
   *
   * DATE FILTERS:
   * - Specific dates:
   *   "date: Jan 3" - Tasks for January 3rd
   *   "date before: May 5" or "date before: 5/5" - Tasks before May 5th
   *   "date after: May 5" - Tasks after May 5th
   * - Relative dates:
   *   "date before: +4 hours" - Tasks due within next 4 hours plus overdue
   *   "5 days" or "next 5 days" - Tasks in next 5 days
   *   "date before: next week" - Tasks before next week starts
   * - Special date filters:
   *   "no date" - Tasks without dates
   *   "!no date" - Tasks with any date
   *   "no time" - Tasks without specific times
   *   "!no time" - Tasks with specific times
   *   "recurring" - Recurring tasks
   *   "!recurring" - Non-recurring tasks
   *
   * PRIORITY FILTERS:
   * - "p1" - Priority 1 (highest)
   * - "p2" - Priority 2
   * - "p3" - Priority 3
   * - "no priority" - No priority set (p4)
   * - "(p1 | p2) & 14 days" - High priority tasks in next 2 weeks
   *
   * ORGANIZATION FILTERS:
   * Labels:
   * - "@email" - Tasks with email label
   * - "no labels" - Tasks without any labels
   * - "@work | @office" - Tasks with either work or office label
   * - "@home*" - Tasks with labels starting with "home"
   *
   * Projects:
   * - "#Work" - Tasks in Work project
   * - "##Work" - Tasks in Work project and its sub-projects
   * - "##School & !#Science" - School project tasks excluding Science project
   *
   * Sections:
   * - "/Meetings" - Tasks in any Meetings section
   * - "#Work & /Meetings" - Tasks in Work project's Meetings section
   * - "!/*" - Tasks not in any section
   * - "!/* & !#Inbox" - Tasks not in sections, excluding Inbox
   *
   * Workspaces:
   * - "workspace: My projects" - Tasks in My Projects workspace
   * - "(workspace: Doist | workspace: Halist)" - Tasks in either workspace
   *
   * TASK PROPERTIES:
   * Search:
   * - "search: Meeting" - Tasks containing "Meeting"
   * - "search: http" - Tasks with web links
   *
   * Creation:
   * - "created: Jan 3 2023" - Tasks created on specific date
   * - "created before: -365 days" - Tasks older than a year
   * - "created: today" - Tasks created today
   *
   * Subtasks:
   * - "subtask" - Show only subtasks
   * - "!subtask" - Show only parent tasks
   *
   * ASSIGNMENT FILTERS:
   * - "assigned to: others" - Tasks assigned to others
   * - "assigned by: Steve Gray" - Tasks assigned by Steve
   * - "assigned by: me" - Tasks you assigned
   * - "assigned" - All assigned tasks
   * - "shared" - Tasks in shared projects
   * - "!assigned to: others" - Tasks not assigned to others
   * - "shared & !assigned" - Unassigned tasks in shared projects
   *
   * COMPLEX EXAMPLES:
   * - "today & !#Work & @important" - Today's important tasks not in Work project
   * - "overdue & !no time, date: today & !no time" - Overdue tasks with time + today's tasks with time
   * - "#Inbox & no due date, All & !#Inbox & !no due date" - Undated Inbox tasks + dated non-Inbox tasks
   * - "(P1 | P2) & 14 days & !assigned to: others" - High priority unassigned tasks in next 2 weeks
   * - "created before: -30 days & no date & !shared" - Month-old undated tasks in private projects
   * - "@urgent* & ##Work & !subtask" - Parent tasks in Work project with urgent-like labels
   */
  query: string;
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
  const temp_id = crypto.randomUUID();

  return syncRequest({
    sync_token,
    resource_types: ["filters"],
    commands: [
      {
        type: "filter_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});
