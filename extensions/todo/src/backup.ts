import { concatMap, Subject, throttleTime } from "rxjs";
import { is_todo, priority_score, Todo } from "./todo";
import fs from "fs/promises";
import { BACKUP_PATH } from "./constants";
import { join } from "path";
import { FileSystemItem, getSelectedFinderItems } from "@raycast/api";

function file_name() {
  const now = new Date();
  const date = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  return join(BACKUP_PATH, `backup_${date}.txt`);
}

export const to_backup = new Subject<[Todo[], Todo[]]>();

const backup_todos = to_backup.pipe(
  throttleTime(2000, undefined, { leading: false, trailing: true }),
  concatMap(async ([todos, dones]) => await fs.writeFile(
      file_name(),
      [...todos, ...dones].map(todo => JSON.stringify(todo) + "\n"),
      "utf8"
    )
  )
);

backup_todos.subscribe();

export async function load_todos_from_selected_file(): Promise<Todo[]> {
  let selected_files: FileSystemItem[];
  try {
    selected_files = await getSelectedFinderItems();
  } catch (err) {
    throw new Error(`Error: Import failed, select a file`);
  }
  if (selected_files.length != 1) {
    throw new Error(`Error: Exactly one file should be selected`);
  }
  const selected_file = await fs.readFile(selected_files[0].path, "utf-8");
  const maybe_todos = selected_file.split("\n");
  if (maybe_todos[maybe_todos.length-1] == ''){
    maybe_todos.pop()
  }
  const confirmed_todos = [];
  while (maybe_todos.length > 0) {
    const todo_str = maybe_todos.pop() as string;
    let parsed_todo;
    try {
      parsed_todo = JSON.parse(todo_str);
    } catch (e) {
      throw new Error(`Error: Todo ${confirmed_todos.length + 1} could not be parsed`);
    }
    if (is_todo(parsed_todo)) {
      confirmed_todos.push(parsed_todo);
    } else {
      throw new Error(`Error: Todo ${confirmed_todos.length + 1} is not a valid todo`);
    }
  }
  return confirmed_todos;
}

export function restore_todos(to_restore: Todo[], set_todos: (todo: Todo[]) => void, set_dones: (todo: Todo[]) => void) {
  const todos = to_restore.filter(todo => !todo.isCompleted);
  const dones = to_restore.filter(todo => todo.isCompleted);
  todos.sort((a, b) => priority_score(b) - priority_score(a));
  set_todos(todos);
  set_dones(dones);
}
