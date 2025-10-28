import { Akiflow } from "../../utils/akiflow";
import { getPreferenceValues } from "@raycast/api";
import { toISO8601WithTimezoneOffset } from "../../utils/time-utils";
import { parseISO } from "date-fns";

type Task = {
  /**
   * The title of the task (required).
   * @example "Review Financials" or "Buy Groceries"
   */
  title: string;

  /**
   * A brief description of the task (optional).
   * @example "Review the company's financial statements." or "[] Apples\n[] Chicken\n[] Salt"
   * @remarks You can also use this for subtasks in the format [] which Akiflow converts to checkboxes. If you do subtasks, you should precede all of them with [] so the user can check them off later. Do not use any other list format like "- ". Each subtask should be a separate line (\n)
   */
  description?: string;

  /**
   * Unique identifier for the task (optional).
   * @remarks This is a UUID and is irrelevant for when the user is creating a task. Only use this when the user requests to edit a task. When the user asks to edit a task, you get the UUID from the get-tasks tool.
   */
  id?: string;

  /**
   * The date associated with the task (optional).
   * @example "2025-04-04"
   * @remarks This is a string in YYYY-MM-DD format. Use this field when the user wants to schedule a task for a day WITHOUT a time, such as "Today", "Tomorrow", "Monday".
   */
  date?: string;

  /**
   * The date and time of the event in ISO 8601 format with timezone offset
   * @example "2024-03-20T15:30:00-07:00" or "2024-03-20T15:30:00+02:00"
   * @remarks For accurate timezone handling, always include the timezone offset (e.g., -07:00, +02:00) rather than using Z (UTC).
   * @remarks Additionally, date must be set even when using datetime; if the user gives you a date and time, set the date field to just the date in YYYY-MM-DD format and exclude the time.
   */
  datetime?: string;

  /**
   * Duration of the task in minutes (optional).
   * @example 60
   */
  duration?: number;

  /**
   * Priority level of the task
   * @remarks this is determined by a number which represents the priority. 99 = no priority, -1 = goal, 1 = high, 2 = medium, 3 = low. If the user does not specify a priority, you can leave the field blank or set it to 99.
   * @example User says make buy groceries my goal of the day. You set priority to -1
   */
  priority?: number;

  /**
   * Identifier for the project to which the task belongs (optional).
   * @remarks This is a UUID, so you must use the get-projects tool to determine the UUID for a project the user asks for.
   * @remarks When a project is returned from get-projects, it has a color field. If the color field is null, this means the project is actually a folder and you must NOT apply it to a task. Only projects with a color are real projects.
   */
  listId?: string;

  /**
   * Indicates if the task is completed (optional).
   */
  done?: boolean;

  /** Status of the task (1: Inbox, 2: Planned, 7: Someday)
   * @remarks This is set automatically dependent on whether a date or time is provided, only set this manually if the user wants to make a task planned for "someday", in which case you will set this value to 7.
   */
  status?: number;

  /**
   * @example "2025-04-04"
   * @remarks This is a string in YYYY-MM-DD format. Use this field when the user wants to give the task a due date or deadline.
   */
  due_date?: string;

  /** Array of tag identifiers associated with the task (optional).
   * @remarks This is a list of UUIDs, so you must use the get-tags tool to determine the UUID for a tag the user asks for
   */
  tags_ids?: string[];
};

/**
 * Creates a new task in the Akiflow system based on the provided input.
 * This function processes the task details and adds it to Akiflow.
 *
 * @param {Task} input - The task object containing details such as title, description, date, etc.
 *      The title is mandatory, while other fields are optional.
 *
 * @returns {Promise<void>} A promise that resolves when the task has been added to Akiflow.
 *
 * @throws {Error} Throws an error if there is an issue with the task creation process.
 *
 * @example
 * const newTask: Task = {
 *   title: "Complete Project Report",
 *   description: "Finish the report on the project status.",
 *   date: "2025-04-10T09:00:00Z",
 *   priority: 1,
 *   tags_ids:
 * };
 *
 * await createTask(newTask);
 *
 * Note: This function retrieves the user's refresh token from Raycast preferences
 *       and initializes the Akiflow instance. It processes optional fields such as
 *       description, date, due date, priority, and tags before adding the task.
 *       Ensure that the title is always provided, as it is required for task creation.
 */
export default async function (input: Task) {
  const refreshToken = getPreferenceValues<Preferences>().refreshToken;
  const akiflow = new Akiflow(refreshToken);
  const task: Task = {
    title: input.title,
  };

  if (input.description) {
    task.description = input.description;
  }
  if (input.date) {
    task.status = 2;
    task.date = input.date;
  }
  if (input.datetime) {
    const date = parseISO(input.datetime);

    task.status = 2;
    task.datetime = toISO8601WithTimezoneOffset(date);
  }
  if (task.status !== 2 && input.status !== 7) {
    task.status = 1;
  }
  if (input.status === 7) {
    task.status = 7;
  }
  if (input.due_date) {
    task.due_date = input.due_date;
  }
  if (input.priority) {
    task.priority = input.priority;
  }
  if (input.tags_ids) {
    task.tags_ids = input.tags_ids; // Add selected tags to the task
  }
  if (input.listId) {
    task.listId = input.listId;
  }
  if (input.duration) {
    task.duration = input.duration * 60;
  }
  return await akiflow.addSingleTask(task);
}
