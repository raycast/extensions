import { exec } from 'child_process';
import { promisify } from 'util';

import { showToast, Toast, getPreferenceValues, openExtensionPreferences } from '@raycast/api';
import queryString from 'query-string';
import type {
  CommandListName,
  Todo,
  AddTodoParams,
  UpdateTodoParams,
  AddProjectParams,
  UpdateProjectParams,
  TodoSummary,
  TodoDetails,
  ProjectDetails,
  AreaDetails,
  CollectionMap,
} from './types';

export { ThingsError } from './api-jxa';

import {
  queryTodosSQL,
  queryTodoDetailsSQL,
  queryTodosDetailsSQL,
  searchTodosSQL,
  queryProjectDetailsSQL,
  queryAreaDetailsSQL,
  getListTodosFromDB,
  getCollectionsFromDB,
  getQuickFindDataFromDB,
} from './api-sql';

import {
  queryTodosJxa,
  queryTodoDetailsJxa,
  queryTodosDetailsJxa,
  searchTodosJxa,
  queryProjectDetailsJxa,
  queryAreaDetailsJxa,
  getListTodosViaJXA,
  getCollectionsJxa,
  getQuickFindDataJXA,
  executeJxa,
  escapeJxa,
} from './api-jxa';

const preferences = getPreferenceValues<Preferences>();

export async function queryTodos(
  opts: {
    listName?: string | null;
    projectId?: string | null;
    areaId?: string | null;
  } = {},
): Promise<TodoSummary[]> {
  if (preferences.useUnofficialApi) {
    return queryTodosSQL(opts);
  }
  return queryTodosJxa(preferences.thingsAppIdentifier, opts);
}

export async function queryTodoDetails(todoId: string): Promise<TodoDetails | null> {
  if (preferences.useUnofficialApi) {
    return queryTodoDetailsSQL(todoId);
  }
  return queryTodoDetailsJxa(preferences.thingsAppIdentifier, todoId);
}

export async function queryTodosDetails(todoIds: string[]): Promise<TodoDetails[]> {
  if (preferences.useUnofficialApi) {
    return queryTodosDetailsSQL(todoIds);
  }
  return queryTodosDetailsJxa(preferences.thingsAppIdentifier, todoIds);
}

export async function searchTodos(query: string): Promise<TodoSummary[]> {
  if (preferences.useUnofficialApi) {
    return searchTodosSQL(query);
  }
  return searchTodosJxa(preferences.thingsAppIdentifier, query);
}

export async function queryProjectDetails(projectId: string): Promise<ProjectDetails | null> {
  if (preferences.useUnofficialApi) {
    return queryProjectDetailsSQL(projectId);
  }
  return queryProjectDetailsJxa(preferences.thingsAppIdentifier, projectId);
}

export async function queryAreaDetails(areaId: string): Promise<AreaDetails | null> {
  if (preferences.useUnofficialApi) {
    return queryAreaDetailsSQL(areaId);
  }
  return queryAreaDetailsJxa(preferences.thingsAppIdentifier, areaId);
}

export const getListTodos = async (commandListName: CommandListName): Promise<Todo[]> => {
  return preferences.useUnofficialApi
    ? getListTodosFromDB(commandListName)
    : getListTodosViaJXA(preferences.thingsAppIdentifier, commandListName);
};

export async function getCollections<K extends keyof CollectionMap>(...keys: K[]): Promise<Pick<CollectionMap, K>> {
  if (preferences.useUnofficialApi) {
    return getCollectionsFromDB(...keys);
  }
  return getCollectionsJxa(preferences.thingsAppIdentifier, ...keys);
}

export const getQuickFindData = () => {
  if (preferences.useUnofficialApi) {
    return getQuickFindDataFromDB();
  }
  return getQuickFindDataJXA(preferences.thingsAppIdentifier);
};

export const getTodoName = (todoId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  const todo = things.toDos.byId('${escapeJxa(todoId)}')

  return todo.name();
`,
    'Get todo name',
  );

export const getProjectName = (projectId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  const project = things.projects.byId('${escapeJxa(projectId)}')

  return project.name();
`,
    'Get project name',
  );

// Properties the set-todo-property AI tool exposes. `status` is intentionally absent:
// completing or canceling a to-do goes through update-todo (see the tool description).
// Spelled out rather than derived (indexed-access or Exclude) because Raycast's AI-tool
// schema extractor only resolves a plain literal union into an enum.
export type SettableTodoProperty =
  'dueDate' | 'activationDate' | 'completionDate' | 'cancellationDate' | 'name' | 'notes' | 'tagNames';

// setTodoProperty also writes `status` for the complete/cancel list and menu-bar actions.
export type WritableTodoProperty = SettableTodoProperty | 'status';

const DATE_PROPERTIES = [
  'dueDate',
  'activationDate',
  'completionDate',
  'cancellationDate',
] as const satisfies readonly WritableTodoProperty[];

export const setTodoProperty = (todoId: string, key: WritableTodoProperty, value: string) => {
  // Date keys must be passed as JS Date objects in JXA — plain strings crash Things.
  // Use the local-time constructor (y, m-1, d) instead of new Date('YYYY-MM-DD') which
  // parses as UTC midnight and shifts the date by one day in negative-offset timezones.
  let valueExpr: string;
  if ((DATE_PROPERTIES as readonly string[]).includes(key)) {
    const [y, m, d] = value.split('-').map(Number);
    valueExpr = `new Date(${y}, ${m - 1}, ${d})`;
  } else {
    valueExpr = `'${escapeJxa(value)}'`;
  }
  return executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.toDos.byId('${escapeJxa(todoId)}').${key} = ${valueExpr};
`,
    'Set todo property',
  );
};

export const deleteTodo = (todoId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.delete(things.toDos.byId('${escapeJxa(todoId)}'));
`,
    'Delete todo',
  );

export const deleteProject = (projectId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.delete(things.projects.byId('${escapeJxa(projectId)}'));
`,
    'Delete project',
  );

async function silentlyOpenThingsURL(url: string) {
  const asyncExec = promisify(exec);
  await asyncExec(`open -g "${url}"`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateQueryString(params: Record<string, any>): string {
  return queryString.stringify(params, {
    skipNull: true,
    skipEmptyString: true,
  });
}

export async function updateTodo(id: string, todoParams: UpdateTodoParams) {
  const { authToken } = getPreferenceValues<Preferences>();

  if (!authToken) throw new Error('unauthorized');

  await silentlyOpenThingsURL(
    `things:///update?${generateQueryString({
      'auth-token': authToken,
      id,
      ...todoParams,
    })}`,
  );
}

export async function updateProject(id: string, projectParams: UpdateProjectParams) {
  const { authToken } = getPreferenceValues<Preferences>();

  if (!authToken) throw new Error('unauthorized');

  await silentlyOpenThingsURL(
    `things:///update-project?${generateQueryString({
      'auth-token': authToken,
      id,
      ...projectParams,
    })}`,
  );
}

export async function addTodo(todoParams: AddTodoParams) {
  await silentlyOpenThingsURL(`things:///add?${generateQueryString(todoParams)}`);
}

export async function addProject(projectParams: AddProjectParams) {
  await silentlyOpenThingsURL(`things:///add-project?${generateQueryString(projectParams)}`);
}

/** Add a JSON payload via the things:///json URL scheme (requires auth token). */
export async function addJson(jsonData: unknown[]): Promise<void> {
  const { authToken } = getPreferenceValues<Preferences>();
  if (!authToken) throw new Error('unauthorized');
  const encoded = encodeURIComponent(JSON.stringify(jsonData));
  await silentlyOpenThingsURL(`things:///json?auth-token=${encodeURIComponent(authToken)}&data=${encoded}`);
}

export async function handleError(error: unknown, title?: string) {
  if (error instanceof Error && error.message === 'unauthorized') {
    await showToast({
      style: Toast.Style.Failure,
      title: 'This action needs an authentication token.',
      message: `Please set it in the extension preferences.\nYou can find your unique token in Things' settings. go to Things → Settings → General → Enable Things URLs → Manage`,
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

  await showToast({
    style: Toast.Style.Failure,
    title: title ?? 'Something went wrong',
    message: error instanceof Error ? error.message : String(error),
  });
}
