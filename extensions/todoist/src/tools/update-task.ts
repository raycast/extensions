import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { priorities, mapPriority } from "../helpers/priorities";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the task to update
   */
  id: string;
  /**
   * The text of the task. Supports markdown-formatted text and hyperlinks
   */
  content?: string;
  /**
   * Optional description for the task. Supports markdown-formatted text and hyperlinks
   */
  description?: string;
  /**
   * The due date of the task. Recommended to use the `string` property with natural language processing.
   *
   * @property string - Natural language date string. Todoist's parser understands a wide variety of formats:
   *   - Simple dates: "tomorrow", "next monday", "march 15"
   *   - Times: "tomorrow at 3pm", "monday at 12:30"
   *   - Recurring: "every monday", "every 2 weeks", "every workday"
   *   - Relative: "in 3 days", "in 2 weeks"
   *   - Combined: "every monday at 10am", "every 1st of month at 12pm"
   * @property timezone - Optional. Include to create a fixed-timezone due date (e.g., "America/Chicago")
   * @property lang - Optional. Language for parsing the date string. Defaults to user's language setting.
   *
   * Examples:
   * ```
   * // Simple date
   * due: { string: "tomorrow" }
   *
   * // With time
   * due: { string: "tomorrow at 3pm" }
   *
   * // With timezone
   * due: {
   *   string: "tomorrow at 3pm",
   *   timezone: "America/Chicago"
   * }
   *
   * // Recurring
   * due: { string: "every monday at 10am" }
   *
   * // Different language
   * due: {
   *   string: "demain à 15h",
   *   lang: "fr"
   * }
   * ```
   *
   * While you can use explicit date formats with the `date` property, the string format
   * is recommended as it's more intuitive and leverages Todoist's powerful natural language processing.
   */
  due?: {
    string?: string;
    timezone?: string;
    lang?:
      | "en"
      | "da"
      | "pl"
      | "zh"
      | "ko"
      | "de"
      | "pt"
      | "ja"
      | "it"
      | "fr"
      | "sv"
      | "ru"
      | "es"
      | "nl"
      | "fi"
      | "nb"
      | "tw";
    date?: string; // Available but string format is recommended
  };
  /**
   * The deadline of the task in the format YYYY-MM-DD (RFC 3339)
   */
  deadline?: { date: string };
  /**
   * The priority of the task (1-4, where 1 is highest priotiy and 4 is the lowest priority).
   */
  priority?: number;
  /**
   * Whether the task's sub-tasks are collapsed
   */
  collapsed?: boolean;
  /**
   * Array of label names that may represent either personal or shared labels
   */
  labels?: string[];
  /**
   * The ID of user who assigns the task. Only relevant for shared projects.
   * Must be 0 or a valid user ID from project collaborators
   */
  assigned_by_uid?: string;
  /**
   * The ID of user responsible for the task. Only relevant for shared projects.
   * Must be a valid user ID from project collaborators or null/empty to unset
   */
  responsible_uid?: string;
  /**
   * The order of the task inside the Today or Next 7 days view (smaller value = higher position)
   */
  day_order?: number;
};

export default withTodoistApi(async function (input: Input) {
  input.priority = mapPriority(input.priority);
  return syncRequest({
    sync_token,
    resource_types: ["items"],
    commands: [
      {
        type: "item_update",
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});

export const confirmation = withTodoistApi(
  async ({
    id,
    content,
    description,
    due,
    deadline,
    priority,
    collapsed,
    labels,
    assigned_by_uid,
    responsible_uid,
    day_order,
  }: Input) => {
    const { items } = await syncRequest({
      sync_token,
      resource_types: ["items"],
    });

    const task = items.find((t) => t.id === id);
    const info = [{ name: "Task", value: task?.content }];

    if (content) {
      info.push({ name: "New Content", value: content });
    }
    if (description) {
      info.push({ name: "New Description", value: description });
    }
    if (due?.string) {
      info.push({ name: "New Due Date", value: due.string });
    } else if (due?.date) {
      info.push({ name: "New Due Date", value: due.date });
    }
    if (deadline?.date) {
      info.push({ name: "New Deadline", value: deadline.date });
    }
    if (priority) {
      const priorityInfo = priorities.find((p) => p.value == mapPriority(priority));
      info.push({ name: "New Priority", value: priorityInfo?.name || `Priority ${priority}` });
    }
    if (collapsed !== undefined) {
      info.push({ name: "Sub-tasks Collapsed", value: collapsed ? "Yes" : "No" });
    }
    if (labels?.length) {
      info.push({ name: "New Labels", value: labels.join(", ") });
    }
    if (assigned_by_uid) {
      info.push({ name: "Assigned By", value: assigned_by_uid });
    }
    if (responsible_uid) {
      info.push({ name: "Responsible User", value: responsible_uid });
    }
    if (day_order !== undefined) {
      info.push({ name: "Day Order", value: day_order.toString() });
    }

    return { info };
  },
);
