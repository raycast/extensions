import { TODO_FILE } from "../config";
import { readTodos } from "../storage";
import { searchTodos, type TodoQuery } from "../queries";

/** Search the local Todo List without modifying it. Due dates and creation times are Unix milliseconds. */
export default function tool(input: TodoQuery) {
  return searchTodos(readTodos(TODO_FILE).sections, input);
}
