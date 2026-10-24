import { TODO_FILE } from "../config";
import { readTodos } from "../storage";
import { summarizeTodos } from "../queries";

/** Summarize the local Todo List. Deadline and priority counts include only incomplete tasks. */
export default function tool() {
  return summarizeTodos(readTodos(TODO_FILE).sections);
}
