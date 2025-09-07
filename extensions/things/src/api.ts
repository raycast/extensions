import { exec } from 'child_process';
import { promisify } from 'util';

import { showToast, Toast, getPreferenceValues, openExtensionPreferences } from '@raycast/api';
import { runAppleScript } from '@raycast/utils';
import qs from 'qs';

export const preferences: Preferences = getPreferenceValues<Preferences>();

export type Todo = {
  id: string;
  name: string;
  status: 'open' | 'completed' | 'canceled';
  tags: string;
  project?: Project;
  area?: Area;
  dueDate: string;
  activationDate: string;
  notes: string;
  isProject?: boolean;
};

export type CommandListName = 'inbox' | 'today' | 'anytime' | 'upcoming' | 'someday' | 'logbook' | 'trash';

export class ThingsError extends Error {
  constructor(
    message: string,
    public readonly type: 'APP_NOT_FOUND' | 'PERMISSION_DENIED' | 'EXECUTION_ERROR' | 'UNKNOWN_ERROR',
    public readonly originalError?: string,
  ) {
    super(message);
    this.name = 'ThingsError';
  }
}

export const executeJxa = async (script: string) => {
  try {
    const result = await runAppleScript(`(function(){${script}})()`, {
      humanReadableOutput: false,
      language: 'JavaScript',
    });

    // Some calls only update data and don't return anything
    if (!result) {
      return;
    }

    // JXA's non-human-readable output is similar to JSON, but is actually a JSON-like representation of the JavaScript object.
    // While values should not be `undefined`, JXA will include {"key": undefined} in its output if they are.
    // This is not valid JSON, so we replace those values with `null` to make it valid JSON.
    return JSON.parse(result.replace(/:\s*undefined/g, ': null'));
  } catch (err: unknown) {
    const errorMessage = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err);
    const message = errorMessage.replace('execution error: Error: ', '');

    if (message.match(/Application can't be found/i)) {
      throw new ThingsError(
        'Things application not found. Please make sure Things is installed and running.',
        'APP_NOT_FOUND',
        message,
      );
      // https://developer.apple.com/documentation/coreservices/1527221-anonymous/erraeeventnotpermitted
    } else if (
      message.match(/not allowed assistive access/i) ||
      message.match(/permission/i) ||
      message.match(/-1743/)
    ) {
      throw new ThingsError(
        'Permission denied. Please grant Raycast access to Things in System Settings > Privacy & Security > Automation > Raycast > Things.',
        'PERMISSION_DENIED',
        message,
      );
    } else if (message.match(/doesn't understand/i) || message.match(/can't get/i)) {
      throw new ThingsError(
        'Things automation interface error. This might be due to a Things version incompatibility or the app not being ready.',
        'EXECUTION_ERROR',
        message,
      );
    } else {
      throw new ThingsError(`Unexpected error: ${message}`, 'UNKNOWN_ERROR', message);
    }
  }
};

const commandListNameToListIdMapping: Record<CommandListName, string> = {
  inbox: 'TMInboxListSource',
  today: 'TMTodayListSource',
  anytime: 'TMNextListSource',
  upcoming: 'TMCalendarListSource',
  someday: 'TMSomedayListSource',
  logbook: 'TMLogbookListSource',
  trash: 'TMTrashListSource',
};

export const getListTodos = (commandListName: CommandListName): Promise<Todo[]> => {
  return executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  const todos = things.lists.byId('${commandListNameToListIdMapping[commandListName]}').toDos();

  return todos.map(todo => ({
    id: todo.id(),
    name: todo.name(),
    status: todo.status(),
    notes: todo.notes(),
    tags: todo.tagNames(),
    dueDate: todo.dueDate() && todo.dueDate().toISOString(),
    activationDate: todo.activationDate() && todo.activationDate().toISOString(),
    isProject: todo.properties().pcls === "project",
    project: todo.project() && {
      id: todo.project().id(),
      name: todo.project().name(),
      status: todo.project().status(),
      tags: todo.project().tagNames(),
      dueDate: todo.project().dueDate() && todo.project().dueDate().toISOString(),
      activationDate: todo.project().activationDate() && todo.project().activationDate().toISOString(),
      area: todo.project().area() && {
        id: todo.project().area().id(),
        name: todo.project().area().name(),
      },
    },
    area: todo.area() && {
      id: todo.area().id(),
      name: todo.area().name(),
    },
  }));
`);
};

export const getTodoName = (todoId: string) =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  const todo = things.toDos.byId('${todoId}')

  return todo.name();
`);

export const getProjectName = (projectId: string) =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  const project = things.projects.byId('${projectId}')

  return project.name();
`);

export const setTodoProperty = (todoId: string, key: string, value: string) =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  things.toDos.byId('${todoId}').${key} = '${value}';
`);

export const deleteTodo = (todoId: string) =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  things.delete(things.toDos.byId('${todoId}'));
`);

export const deleteProject = (projectId: string) =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  things.delete(things.projects.byId('${projectId}'));
`);

export const getTags = (): Promise<string[]> =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  return things.tags().map(tag => tag.name());
`);

export type Project = {
  id: string;
  name: string;
  status: 'open' | 'completed' | 'canceled';
  tags: string;
  dueDate: string;
  activationDate: string;
  notes: string;
  area?: Area;
};

export const getProjects = async (): Promise<Project[]> => {
  return executeJxa(`
    const things = Application('${preferences.thingsAppIdentifier}');
    const projects = things.projects();

    return projects.map(project => ({
      id: project.id(),
      name: project.name(),
      status: project.status(),
      notes: project.notes(),
      tags: project.tagNames(),
      dueDate: project.dueDate() && project.dueDate().toISOString(),
      activationDate: project.activationDate() && project.activationDate().toISOString(),
      area: project.area() && {
        id: project.area().id(),
        name: project.area().name(),
      },
    }));
  `);
};

export type Area = {
  id: string;
  name: string;
};

export const getAreas = async (): Promise<Area[]> => {
  return executeJxa(`
    const things = Application('${preferences.thingsAppIdentifier}');
    const areas = things.areas();

    return areas.map(area => ({
      id: area.id(),
      name: area.name(),
    }));
  `);
};

export type List = { id: string; name: string; type: 'area' | 'project' };

export const getLists = async (): Promise<List[]> => {
  const projects = (await getProjects()) || [];
  const areas = (await getAreas()) || [];

  const projectsWithoutAreas = projects
    .filter((project) => !project.area)
    .map((project) => ({ ...project, type: 'project' as const }));

  const organizedAreasAndProjects: { name: string; id: string; type: 'area' | 'project' }[] = [];
  areas.forEach((area) => {
    organizedAreasAndProjects.push({
      ...area,
      type: 'area' as const,
    });

    const associatedProjects = projects
      .filter((project) => project.area && project.area.id === area.id)
      .map((project) => ({
        ...project,
        type: 'project' as const,
      }));
    organizedAreasAndProjects.push(...associatedProjects);
  });

  return [...projectsWithoutAreas, ...organizedAreasAndProjects];
};

export type TodoParams = {
  /** The title of the to-do to add. Ignored if titles is also specified. */
  title?: string;
  /** String separated by new lines (encoded to %0a). Use instead of title to create multiple to-dos. Takes priority over title and show-quick-entry. The other parameters are applied to all the created to-dos. */
  titles?: string;
  /** The text to use for the notes field of the to-do. Maximum unencoded length: 10,000 characters. */
  notes?: string;
  /** Text to add before the existing notes of a to-do. Maximum unencoded length: 10,000 characters. */
  'prepend-notes'?: string;
  /** Text to add after the existing notes of a to-do. Maximum unencoded length: 10,000 characters. */
  'append-notes'?: string;
  /** Possible values: today, tomorrow, evening, anytime, someday, a date string, or a date time string. Using a date time string adds a reminder for that time. The time component is ignored if anytime or someday is specified. */
  when?: string;
  /** The deadline to apply to the to-do. */
  deadline?: string;
  /** Comma separated strings corresponding to the titles of tags. Does not apply a tag if the specified tag doesn't exist. */
  tags?: string;
  /** Comma separated strings corresponding to the titles of tags. Adds the specified tags to a to-do. Does not apply a tag if the specified tag doesn't exist. */
  'add-tags'?: string;
  /** String separated by new lines (encoded to %0a). Checklist items to add to the to-do (maximum of 100). */
  'checklist-items'?: string;
  /** String separated by new lines (encoded to %0a). Add checklist items to the front of the list of checklist items in the to-do (maximum of 100). */
  'prepend-checklist-items'?: string;
  /** String separated by new lines (encoded to %0a). Add checklist items to the end of the list of checklist items in the to-do (maximum of 100). */
  'append-checklist-items'?: string;
  /** Possible values can be replace-title (newlines overflow into notes, replacing them), replace-notes, or replace-checklist-items (newlines create multiple checklist rows). Takes priority over title, notes, or checklist-items. */
  'use-clipboard'?: string;
  /** The ID of a project or area to add to. Takes precedence over list. */
  'list-id'?: string;
  /** The title of a project or area to add to. Ignored if list-id is present. */
  list?: string;
  /** Takes precedence over heading. The ID of a heading within a project to add to. Ignored if a project is not specified, or if the heading doesn't exist. */
  'heading-id'?: string;
  /** The title of a heading within a project to add to. Ignored if heading-id is present, if a project is not specified, or if the heading doesn't exist. */
  heading?: string;
  /** Whether or not the to-do should be set to complete. Default: false. Ignored if canceled is also set to true. */
  completed?: boolean;
  /** Whether or not the to-do should be set to canceled. Default: false. Takes priority over completed. */
  canceled?: boolean;
  /** Whether or not to show the quick entry dialog (populated with the provided data) instead of adding a new to-do. Ignored if titles is specified. Default: false. */
  'show-quick-entry'?: boolean;
  /** Whether or not to navigate to and show the newly created to-do. If multiple to-dos have been created, the first one will be shown. Ignored if show-quick-entry is also set to true. Default: false. */
  reveal?: boolean;
  /** Set to true to duplicate the to-do before updating it, leaving the original to-do untouched. Repeating to-dos cannot be duplicated. Default: false. */
  duplicate?: boolean;
  /** ISO8601 date time string. The date to set as the creation date for the to-do in the database. Ignored if the date is in the future. */
  'creation-date'?: string;
  /** ISO8601 date time string. The date to set as the completion date for the to-do in the database. Ignored if the to-do is not completed or canceled, or if the date is in the future. */
  'completion-date'?: string;
};

export async function silentlyOpenThingsURL(url: string) {
  const asyncExec = promisify(exec);
  await asyncExec(`open -g "${url}"`);
}

export async function updateTodo(id: string, todoParams: TodoParams) {
  const { authToken } = getPreferenceValues<Preferences>();

  if (!authToken) throw new Error('unauthorized');

  await silentlyOpenThingsURL(
    `things:///update?${qs.stringify({
      'auth-token': authToken,
      id,
      ...todoParams,
    })}`,
  );
}

export async function updateProject(id: string, projectParams: ProjectParams) {
  const { authToken } = getPreferenceValues<Preferences>();

  if (!authToken) throw new Error('unauthorized');

  await silentlyOpenThingsURL(
    `things:///update-project?${qs.stringify({
      'auth-token': authToken,
      id,
      ...projectParams,
    })}`,
  );
}

export async function addTodo(todoParams: TodoParams) {
  await silentlyOpenThingsURL(`things:///add?${qs.stringify(todoParams)}`);
}

export type ProjectParams = {
  /** The title of the project. */
  title?: string;
  /** The text to use for the notes field of the project. Maximum unencoded length: 10,000 characters. */
  notes?: string;
  /** Text to add before the existing notes of a project. Maximum unencoded length: 10,000 characters. */
  'prepend-notes'?: string;
  /** Text to add after the existing notes of a project. Maximum unencoded length: 10,000 characters. */
  'append-notes'?: string;
  /** Possible values: today, tomorrow, evening, anytime, someday, a date string, or a date time string. Using a date time string adds a reminder for that time. The time component is ignored if anytime or someday is specified. */
  when?: string;
  /** The deadline to apply to the project. */
  deadline?: string;
  /** Comma separated strings corresponding to the titles of tags. Does not apply a tag if the specified tag doesn't exist. */
  tags?: string;
  /** Comma separated strings corresponding to the titles of tags. Adds the specified tags to a project. Does not apply a tag if the specified tag doesn't exist. */
  'add-tags'?: string;
  /** The ID of an area to add to. Takes precedence over area. */
  'area-id'?: string;
  /** The title of an area to add to. Ignored if area-id is present. */
  area?: string;
  /** String separated by new lines (encoded to %0a). Titles of to-dos to create inside the project. */
  'to-dos'?: string;
  /** Whether or not the project should be set to complete. Default: false. Ignored if canceled is also set to true. Will set all child to-dos to be completed. */
  completed?: boolean;
  /** Whether or not the project should be set to canceled. Default: false. Takes priority over completed. Will set all child to-dos to be canceled. */
  canceled?: boolean;
  /** Whether or not to navigate into the newly created project. Default: false. */
  reveal?: boolean;
  /** Set to true to duplicate the project before updating it, leaving the original project untouched. Repeating projects cannot be duplicated. Default: false. */
  duplicate?: boolean;
  /** ISO8601 date time string. The date to set as the creation date for the project in the database. If the to-dos parameter is also specified, this date is applied to them, too. Ignored if the date is in the future. */
  'creation-date'?: string;
  /** ISO8601 date time string. The date to set as the completion date for the project in the database. If the to-dos parameter is also specified, this date is applied to them, too. Ignored if the to-do is not completed or canceled, or if the date is in the future. */
  'completion-date'?: string;
};

export async function addProject(projectParams: ProjectParams) {
  await silentlyOpenThingsURL(`things:///add-project?${qs.stringify(projectParams)}`);
}

export function handleError(error: unknown, title?: string) {
  if (error instanceof Error && error.message === 'unauthorized') {
    showToast({
      style: Toast.Style.Failure,
      title: 'This action needs an authentication token.',
      message:
        'Please set it in the extension preferences.\nYou can find your unique token in Things’ settings. go to Things → Settings → General → Enable Things URLs → Manage',
      primaryAction: {
        title: 'Open Extension Preferences',
        onAction(toast) {
          openExtensionPreferences();
          toast.hide();
        },
      },
    });
    return;
  }

  showToast({
    style: Toast.Style.Failure,
    title: title ?? 'Something went wrong',
    message: error instanceof Error ? error.message : String(error),
  });
}
