import { Task } from "../api";
import { mapPriority } from "../helpers/priorities";
import { getTodoistApi, withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * Filter tasks by any supported filter. Supports advanced filtering with various operators and keywords.
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
   *
   * Note: Multiple filters (using the comma operator) are not supported
   */
  query: string;

  /**
   * IETF language tag defining what language filter is written in,
   * if differs from default English
   */
  lang?: string;
};

export default withTodoistApi(async (input: Input) => {
  const todoistApi = getTodoistApi();
  const { data } = await todoistApi.get<{ results: Task[] }>("/tasks/filter", { params: input });

  const results = data.results.map((input) => ({
    ...input,
    priority: mapPriority(input.priority),
  }));

  return results;
});
