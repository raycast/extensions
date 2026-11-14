import { searchTasks, TaskView } from "./shared";

type Input = {
  /**
   * Optional text to match against titles, notes, and list names.
   * Omit this to list tasks in the selected view.
   */
  query?: string;
  /**
   * Which tasks to search. Defaults to open.
   * Use overdue, today, upcoming, undated, or completed for those views.
   */
  view?: TaskView;
  /**
   * Optional list id from list-task-lists or search-tasks.
   */
  listId?: string;
  /**
   * Optional list title, such as My Tasks. Use list-task-lists if several lists could match.
   */
  listName?: string;
  /**
   * Maximum tasks to return. Defaults to 20, maximum 50.
   */
  limit?: number;
  /**
   * Skip this many matching tasks. Use the nextOffset from the previous search-tasks result to get the next page.
   */
  offset?: number;
};

/**
 * Search Google Tasks. Returns compact results, not full notes.
 * If hasMore is true, call again with the same filters and offset set to nextOffset.
 * Call get-task with a returned id and listId when you need the full task.
 */
export default async function (input: Input = {}) {
  return searchTasks(input);
}
