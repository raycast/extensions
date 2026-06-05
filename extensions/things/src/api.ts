import { exec } from 'child_process';
import { promisify } from 'util';

import { showToast, Toast, getPreferenceValues, openExtensionPreferences } from '@raycast/api';
import queryString from 'query-string';
import {
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
} from './types';

// Re-export shared types and helpers so callers only need to import from './api'
export type { TagWithParent } from './api-sql';
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
  CollectionMap,
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
} from './api-jxa';

const preferences = getPreferenceValues<Preferences>();

// ---------------------------------------------------------------------------
// Facade functions — switch between SQL and JXA based on preference
// ---------------------------------------------------------------------------

/** Query todos with optional list/project/area filter. */
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

/** Query a single todo's full details including checklist items. */
export async function queryTodoDetails(todoId: string): Promise<TodoDetails | null> {
  if (preferences.useUnofficialApi) {
    return queryTodoDetailsSQL(todoId);
  }
  return queryTodoDetailsJxa(preferences.thingsAppIdentifier, todoId);
}

/** Query multiple todos' full details in batch. */
export async function queryTodosDetails(todoIds: string[]): Promise<TodoDetails[]> {
  if (preferences.useUnofficialApi) {
    return queryTodosDetailsSQL(todoIds);
  }
  return queryTodosDetailsJxa(preferences.thingsAppIdentifier, todoIds);
}

/** Search todos by title/notes keyword. */
export async function searchTodos(query: string): Promise<TodoSummary[]> {
  if (preferences.useUnofficialApi) {
    return searchTodosSQL(query);
  }
  return searchTodosJxa(preferences.thingsAppIdentifier, query);
}

/** Query a single project's full details. */
export async function queryProjectDetails(projectId: string): Promise<ProjectDetails | null> {
  if (preferences.useUnofficialApi) {
    return queryProjectDetailsSQL(projectId);
  }
  return queryProjectDetailsJxa(preferences.thingsAppIdentifier, projectId);
}

/** Query a single area's full details. */
export async function queryAreaDetails(areaId: string): Promise<AreaDetails | null> {
  if (preferences.useUnofficialApi) {
    return queryAreaDetailsSQL(areaId);
  }
  return queryAreaDetailsJxa(preferences.thingsAppIdentifier, areaId);
}

/** Get todos for a specific list. */
export const getListTodos = async (commandListName: CommandListName): Promise<Todo[]> => {
  const result = preferences.useUnofficialApi
    ? await getListTodosFromDB(commandListName)
    : await getListTodosViaJXA(preferences.thingsAppIdentifier, commandListName);
  console.log(
    `[getListTodos] list=${commandListName} mode=${preferences.useUnofficialApi ? 'SQL' : 'JXA'} count=${result.length}`,
  );
  console.log(`[getListTodos] items:`, JSON.stringify(result, null, 2));
  return result;
};

/** Get collections (tags, projects, areas, lists). */
export async function getCollections<K extends keyof CollectionMap>(...keys: K[]): Promise<Pick<CollectionMap, K>> {
  if (preferences.useUnofficialApi) {
    return getCollectionsFromDB(...keys);
  }
  return getCollectionsJxa(preferences.thingsAppIdentifier, ...keys);
}

/** Get data for the quick find command. */
export const getQuickFindData = () => {
  if (preferences.useUnofficialApi) {
    return getQuickFindDataFromDB();
  }
  return getQuickFindDataJXA(preferences.thingsAppIdentifier);
};

// ---------------------------------------------------------------------------
// JXA write operations (always JXA — URL scheme not available for reads)
// ---------------------------------------------------------------------------

export const getTodoName = (todoId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  const todo = things.toDos.byId('${todoId}')

  return todo.name();
`,
    'Get todo name',
  );

export const getProjectName = (projectId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  const project = things.projects.byId('${projectId}')

  return project.name();
`,
    'Get project name',
  );

const DATE_KEYS = new Set(['dueDate', 'activationDate', 'completionDate', 'cancellationDate']);

export const setTodoProperty = (todoId: string, key: string, value: string) => {
  // Date keys must be passed as JS Date objects in JXA — plain strings crash Things.
  // Use the local-time constructor (y, m-1, d) instead of new Date('YYYY-MM-DD') which
  // parses as UTC midnight and shifts the date by one day in negative-offset timezones.
  let valueExpr: string;
  if (DATE_KEYS.has(key)) {
    const [y, m, d] = value.split('-').map(Number);
    valueExpr = `new Date(${y}, ${m - 1}, ${d})`;
  } else {
    valueExpr = `'${value}'`;
  }
  return executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.toDos.byId('${todoId}').${key} = ${valueExpr};
`,
    'Set todo property',
  );
};

export const deleteTodo = (todoId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.delete(things.toDos.byId('${todoId}'));
`,
    'Delete todo',
  );

export const deleteProject = (projectId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.delete(things.projects.byId('${projectId}'));
`,
    'Delete project',
  );

// ---------------------------------------------------------------------------
// URL scheme write operations
// ---------------------------------------------------------------------------

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
