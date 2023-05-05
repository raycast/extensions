import { Icon } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Subset, TodoCore, TodoGroupType, TodoStatus } from "../../types";
import { quoteAndEscape, toAppleScriptDate } from "../applescript";
import { thingsList, THINGS_URL_PREFIX } from "./things-sql";
import { OptionalAction, TodoFormData, TodoSourceList, UpdateTodoData } from "./types";

type AppleScriptTypeSpecifier =
  | "name"
  | "notes"
  | "activation date"
  | "due date"
  | "completion date"
  | "tag names"
  | "status"
  | TodoGroupType; // list, area, project

interface AppleScript {
  command: `set ${AppleScriptTypeSpecifier} of` | `delete ${AppleScriptTypeSpecifier} of` | "schedule" | "move";
  expression: string;
}

type AppleScripter<T> = {
  [K in keyof T]: (value: T[K]) => AppleScript | null;
};

export const enabledAction: Record<OptionalAction, boolean> = {
  setStartDate: true,
  setPriority: false,
  markAsCanceled: true,
};

const appleScriptTypeSpecifier: Record<keyof Omit<UpdateTodoData, "priority">, AppleScriptTypeSpecifier> = {
  title: "name",
  startDate: "activation date",
  dueDate: "due date",
  status: "status",
  group: "list", // should not be used; `group.type` should be used instead.
  tags: "tag names",
  notes: "notes",
};

const toTagNames = (tags: UpdateTodoData["tags"]) => quoteAndEscape(tags?.map(({ name }) => name).join(",") ?? "");

const appleScripter: AppleScripter<UpdateTodoData> = {
  title: (title) => ({
    command: `set ${appleScriptTypeSpecifier.title} of`,
    expression: "to " + quoteAndEscape(title),
  }),

  status: (status) => ({ command: "set status of", expression: "to " + TodoStatus[status] }),

  startDate: (startDate) =>
    startDate
      ? { command: "schedule", expression: "for " + toAppleScriptDate(startDate) }
      : { command: "move", expression: 'to list "Anytime"' },

  dueDate: (dueDate) =>
    dueDate
      ? { command: `set ${appleScriptTypeSpecifier.dueDate} of`, expression: "to " + toAppleScriptDate(dueDate) }
      : { command: `delete ${appleScriptTypeSpecifier.dueDate} of`, expression: "" },

  group: (group) =>
    group.type === "list"
      ? { command: "move", expression: `to list "${group.id}"` }
      : group.id !== ""
      ? { command: `set ${group.type} of`, expression: `to ${group.type} id "${group.id}"` }
      : { command: `delete ${group.type} of`, expression: "" },

  tags: (tags) => ({
    command: `set ${appleScriptTypeSpecifier.tags} of`,
    expression: `to ${toTagNames(tags)}`,
  }),

  notes: (notes) =>
    notes
      ? { command: `set ${appleScriptTypeSpecifier.notes} of`, expression: "to " + quoteAndEscape(notes) }
      : { command: `delete ${appleScriptTypeSpecifier.notes} of`, expression: "" },

  priority: () => null,
};

// This string value in `EditTodoForm`'s "Area/Project" dropdown indicates that the to-do did not belong to an area or
// a project before the edit, and should stay the same way after the edit.
// - If the to-do belonged to an area or a project before the edit, the dropdown value would be either
//   `JSON.stringify({ type: "area", id: "", title: "No Area" })` or
//   `JSON.stringify({ type: "project", id: "", title: "No Project" })` as set by `getThingsMoveDestinationLists()`, and
//   these values will be passed to `updateTodo()` to get the to-do detached from its current area/project.
// - `Form.Dropdown.Item.value` does not accept `null` or `undefined`, so it has to be a string value.
// - Unlike at creation, moving a to-do to "Anytime" is not equivalent to "No Area/Project".
// - This is a Things-only problem because every reminder/task belongs to a List or Project in Reminders/Todoist.
const noAreaOrProjectList = { type: "list" as TodoGroupType, id: "", title: "No Area/Project" };

export const NO_AREA_PROJECT_VALUE = JSON.stringify(noAreaOrProjectList);

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getThingsMoveDestiationLists(
  currentGroup?: UpdateTodoData["group"] | null,
  hideNoAreaOrProjectIfCurrentGroupIsAbsent?: boolean
): TodoSourceList[] {
  const noAreaOrProject: TodoSourceList = {
    type: currentGroup?.type ?? noAreaOrProjectList.type,
    id: noAreaOrProjectList.id,
    title: currentGroup ? `No ${capitalize(currentGroup.type)}` : noAreaOrProjectList.title,
    icon: Icon.Multiply,
  };

  return !currentGroup && hideNoAreaOrProjectIfCurrentGroupIsAbsent
    ? [thingsList.inbox, thingsList.someday]
    : [thingsList.inbox, thingsList.someday, thingsList.anytime, noAreaOrProject];
}

export async function createTodo(data: TodoFormData): Promise<Pick<TodoCore, "todoId" | "url">> {
  const { title, startDate, dueDate, group, tags, notes } = data;

  const properties = [`${appleScriptTypeSpecifier.title}:${quoteAndEscape(title)}`];

  if (dueDate) {
    properties.push(`${appleScriptTypeSpecifier.dueDate}:${toAppleScriptDate(dueDate)}`);
  }

  if (tags && tags.length > 0) {
    properties.push(`${appleScriptTypeSpecifier.tags}:${toTagNames(tags)}`);
  }

  if (notes) {
    properties.push(`${appleScriptTypeSpecifier.notes}:${quoteAndEscape(notes)}`);
  }

  const list =
    group.id === noAreaOrProjectList.id
      ? ' at beginning of list "Anytime"'
      : ` at beginning of ${group.type} ${group.type === "list" ? "" : "id "}"${group.id}"`;

  const schedule = startDate ? `schedule t for ${toAppleScriptDate(startDate)}` : "";

  const script = `tell application "Things3"
      set t to make new to do ¬
        with properties {${properties.join(", ")}}${list}
      ${schedule}
    end tell
    return t's id`;

  const todoId = await runAppleScript(script);

  return { todoId, url: THINGS_URL_PREFIX + todoId };
}

export async function updateTodo<T extends Partial<UpdateTodoData>>(
  todoId: string,
  editedProperties: Subset<Partial<UpdateTodoData>, T>
): Promise<void> {
  const commandLines: string[] = [];
  for (const [key, value] of Object.entries(editedProperties)) {
    const appleScript = appleScripter[key as keyof UpdateTodoData](
      value as Subset<Partial<UpdateTodoData>, T>[keyof UpdateTodoData]
    );
    if (appleScript) {
      commandLines.push(`${appleScript.command} theTodo ${appleScript.expression}`);
    }
  }

  if (commandLines.length > 0) {
    const script = `tell application "Things3"
        set theTodo to to do id "${todoId}"
        ${commandLines.join("\n")}
      end tell`;
    await runAppleScript(script);
  }
}

export async function deleteTodo(todoId: string): Promise<void> {
  const script = `tell application "Things3" to move to do id "${todoId}" to list "Trash"`;
  await runAppleScript(script);
}
