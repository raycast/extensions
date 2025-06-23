import { Akiflow } from "../../utils/akiflow";
import { getPreferenceValues } from "@raycast/api";

// Define the expected structure of a task
interface Task {
  /**
   * @remarks This is the title of the task and will always be provided.
   * @examples "Review Financials" or "Buy Groceries"
   */
  title: string;

  /**
   * @remarks This is a brief description of the task.
   * @examples "Review the company's financial statements." or "Remember to buy milk."
   */
  description: string;

  /**
   * @remarks this is the UUID of the task and will always be provided. You can use this to edit the task.
   */
  id: string;

  /**
   * @remarks This is the date associated with the task in YYYY-MM-DD format.
   * @examples "2025-04-12"
   * @remarks This date is already in the user's timezone. Use the get-current-time tool to get the current time in the user's timezone if they ask for a relative date like today.
   */
  date: string;

  /**
   * @remarks This is the date and time of the event in ISO 8601 format. It is already in the user's timezone.
   * @examples "2024-03-20T15:30:00"
   */
  datetime: string;

  /**
   * @remarks This is the duration of the task in minutes.
   * @examples 60
   */
  duration: number;

  /**
   * @remarks This is the priority level of the task. It is a number that represents the priority. 99 or null = no priority, -1 = goal, 1 = high, 2 = medium, 3 = low.
   * @examples -1
   */
  priority: number;

  /**
   * This is the project of the task. It is a UUID and will sometimes be provided. If it is null, the task is not associated with a project.
   * @remarks This is a UUID, so you must use the get-projects tool to determine the title of the project.
   * @remarks When a project is returned from get-projects, it has a color field. If the color field is null, this means the project is actually a folder and you must NOT apply it to a task. Only projects with a color are real projects.
   */
  listId: string;

  /**
   * Whether or not the task is completed.
   * @examples true or false
   */
  done: boolean;

  /**
   * @remarks This is a number that represents the status of the task. 1 = Inbox, 2 = Planned, 7 = Someday.
   * @examples 1,2,7
   */
  status: number;

  /**
   * @remarks This is the due date of the task in YYYY-MM-DD format.
   * @examples "2025-04-12"
   * @remarks This date is already in the user's timezone. Use the get-current-time tool to get the current time in the user's timezone if they ask for a relative date like today.
   */
  due_date: string;

  /**
   * @remarks This is an array of tag UUIDs associated with the task. Use the get-tags tool to determine the title of the tag given its UUID.
   */
  tags_ids: string[];

  /**
   * @remarks These two fields are used to filter out things the user has removed from their account.
   */
  deleted_at: string | null;
  trashed_at: string | null;
}

// Define the filter parameters
interface FilterParams {
  title?: string;
  description?: string;
  id?: string;
  date?: string;
  datetime?: string;
  duration?: number;
  priority?: number;
  listId?: string;
  done: false | true;
  status?: number;
  due_date?: string;
  tags_ids?: string[];
}

// Function to check if a task matches the filter
function matchesFilter(task: Task, filter: FilterParams): boolean {
  return Object.keys(filter).every((key) => {
    if (filter[key as keyof FilterParams] === undefined) return true; // Skip undefined filters

    const taskValue = task[key as keyof Task];
    const filterValue = filter[key as keyof FilterParams];

    // Handle default value for done if not explicitly provided
    if (key === "done" && filterValue === undefined) {
      return task.done === false; // Default to false if not specified
    }

    // Handle array comparison for tags_ids
    if (Array.isArray(filterValue) && Array.isArray(taskValue)) {
      return filterValue.every((tag) => taskValue.includes(tag));
    }

    if (typeof filterValue === "string" && typeof taskValue === "string") {
      return filterValue.toLowerCase() === taskValue.toLowerCase();
    }
    return taskValue === filterValue; // Direct comparison for other types
  });
}

// Main function to get filtered tasks
export default async function getFilteredTasks(filterParams: FilterParams) {
  const refreshToken = getPreferenceValues<Preferences>().refreshToken;
  const akiflow = new Akiflow(refreshToken);

  // Fetch all tasks
  const response = await akiflow.getTasks();
  const tasks = response.data; // Access the data key to get the list of tasks

  // Filter out deleted tasks
  const notDeletedTasks = tasks.filter((task: Task) => task.deleted_at === null && task.trashed_at === null);

  // Debugging: Log the number of tasks before and after filtering
  // console.log(`Total tasks: ${tasks.length}`);
  // console.log(`Tasks after filtering deleted: ${notDeletedTasks.length}`);

  // Filter tasks based on the provided filter parameters
  const filteredTasks = notDeletedTasks.filter((task: Task) => matchesFilter(task, filterParams));

  // Sort the filtered tasks based on date properties
  filteredTasks.sort((a: Task, b: Task) => {
    const dateA = a.date
      ? new Date(a.date)
      : a.datetime
        ? new Date(a.datetime)
        : a.due_date
          ? new Date(a.due_date)
          : new Date(Infinity); // Far future date

    const dateB = b.date
      ? new Date(b.date)
      : b.datetime
        ? new Date(b.datetime)
        : b.due_date
          ? new Date(b.due_date)
          : new Date(Infinity); // Far future date

    return dateA.getTime() - dateB.getTime(); // Ascending order
  });

  return filteredTasks;
}
