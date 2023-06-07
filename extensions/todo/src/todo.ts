import { SetStateAction } from 'react';

export interface Todo {
  id: string;
  title: string;
  isCompleted: boolean;
  urgent: boolean;
  important: boolean;
  quick: boolean;
}

// state modification actions

type Action = SetStateAction<Todo[]>;

export function create_todo(todo: Todo): Action {
  return (todos: Todo[]) => insert_todo_in_todo_list(todo, [...(todos || [])]);
}

export function edit_todo(index: number, patch: Partial<Todo>): Action {
  return (todos: Todo[]) =>
    insert_todo_in_todo_list(
      { ...(todos?.[index] as Todo), ...patch }, // add
      (todos ?? []).filter((_, i) => i !== index), // filter = copy + remove
    );
}

export function has_text(text: string): (todo: Todo) => boolean {
  const query = text.split(' ').map((q) => q.trim().toLowerCase());

  function subquery_applies(subquery: string): (todo: Todo) => boolean {
    const regex = /^(urgent|u|quick|q|important|i)[ ]=(true|false|t|f|yes|no|y|n)$/im;
    const matches: RegExpExecArray | null = regex.exec(subquery);
    if (matches === null) {
      return (todo: Todo) => todo.title.toLowerCase().includes(subquery);
    }
    const value = matches[2].startsWith('t') || matches[2].startsWith('y');
    if (matches[1].startsWith('u')) return (todo: Todo) => todo.urgent == value;
    if (matches[1].startsWith('i')) return (todo: Todo) => todo.important == value;
    if (matches[1].startsWith('q')) return (todo: Todo) => todo.quick == value;

    // if it didn't match, then don't filter.
    return () => true;
  }

  const query_matchers = query.map((subquery) => subquery_applies(subquery));

  return (todo) => query_matchers.every((matcher) => matcher(todo));
}

// helper functions, no mutations

export function priority_score(todo: Todo) {
  let score = 0;
  if (todo.quick) score += 1.1;
  if (todo.important) score += 2;
  if (todo.urgent) score += 3;
  return score;
}

// attention, this function mutates todo_list
function insert_todo_in_todo_list(todo: Todo, todo_list: Todo[]) {
  const todo_score = priority_score(todo);
  const index = todo_list.findIndex((t) => priority_score(t) <= todo_score);
  if (index === -1) {
    todo_list.push(todo);
  } else {
    todo_list.splice(index, 0, todo);
  }
  return todo_list;
}

export function is_todo(todo: any): todo is Todo {
  return !(
    typeof todo?.id !== 'string' ||
    typeof todo?.title !== 'string' ||
    typeof todo?.isCompleted !== 'boolean' ||
    typeof todo?.urgent !== 'boolean' ||
    typeof todo?.important !== 'boolean' ||
    typeof todo?.quick !== 'boolean'
  );
}
