import { exec } from 'child_process';
import { promisify } from 'util';

import { showToast, Toast, getPreferenceValues, openExtensionPreferences } from '@raycast/api';
import { runAppleScript } from '@raycast/utils';
import queryString from 'query-string';
import {
  Area,
  CommandListName,
  List,
  Project,
  Todo,
  AddTodoParams,
  UpdateTodoParams,
  AddProjectParams,
  UpdateProjectParams,
} from './types';

export const preferences = getPreferenceValues<Preferences>();

export class ThingsError extends Error {
  constructor(
    message: string,
    public readonly type: 'APP_NOT_FOUND' | 'PERMISSION_DENIED' | 'EXECUTION_ERROR' | 'UNKNOWN_ERROR',
    public readonly originalError?: string,
    public readonly operation?: string,
  ) {
    super(operation ? `${operation}: ${message}` : message);
    this.name = 'ThingsError';
  }
}

export const executeJxa = async (script: string, operation?: string) => {
  try {
    const result = await runAppleScript(`(function(){${script}})()`, {
      humanReadableOutput: false,
      language: 'JavaScript',
      timeout: 60 * 1000, // 60 seconds
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
        operation,
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
        operation,
      );
    } else if (message.match(/doesn't understand/i) || message.match(/can't get/i)) {
      throw new ThingsError(
        'Things automation interface error. This might be due to a Things version incompatibility or the app not being ready.',
        'EXECUTION_ERROR',
        message,
        operation,
      );
    } else if (message.match(/timed out/i)) {
      throw new ThingsError(
        'Command timed out. Things may be unresponsive or not running.',
        'EXECUTION_ERROR',
        message,
        operation,
      );
    } else {
      throw new ThingsError(`Unexpected error: ${message}`, 'UNKNOWN_ERROR', message, operation);
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
  return executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  const todos = things.lists.byId('${commandListNameToListIdMapping[commandListName]}').toDos();

  return todos.map(todo => {
    const props = todo.properties();

    let areaTags = '';
    const areaRef = props.area;

    let project = null;
    const projectRef = props.project;
    if (projectRef) {
      const projectProps = projectRef.properties();
      let projectArea = null;
      const projectAreaRef = projectProps.area;
      if (projectAreaRef) {
        const areaProps = projectAreaRef.properties();
        projectArea = { id: areaProps.id, name: areaProps.name };
        areaTags = projectAreaRef.tagNames() || '';
      }
      project = {
        id: projectProps.id,
        name: projectProps.name,
        status: projectProps.status,
        tags: projectRef.tagNames(),
        dueDate: projectProps.dueDate ? projectProps.dueDate.toISOString() : null,
        activationDate: projectProps.activationDate ? projectProps.activationDate.toISOString() : null,
        area: projectArea,
      };
    }

    let area = null;
    if (areaRef && !projectRef) {
      const areaProps = areaRef.properties();
      area = { id: areaProps.id, name: areaProps.name };
      areaTags = areaRef.tagNames() || '';
    }

    return {
      id: props.id,
      name: props.name,
      status: props.status,
      notes: props.notes,
      tags: todo.tagNames(),
      areaTags: areaTags || null,
      dueDate: props.dueDate ? props.dueDate.toISOString() : null,
      activationDate: props.activationDate ? props.activationDate.toISOString() : null,
      isProject: props.pcls === "project",
      project,
      area,
    };
  });
`,
    `Get ${commandListName} list`,
  );
};

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

export const setTodoProperty = (todoId: string, key: string, value: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.toDos.byId('${todoId}').${key} = '${value}';
`,
    'Set todo property',
  );

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

// JXA mapping templates - reusable across individual and combined queries
// Uses properties() batching to minimize Apple Event overhead
const mapTagJxa = `tag => tag.name()`;

const mapTagWithHierarchyJxa = `tag => {
  const props = tag.properties();
  const parentRef = props.parentTag;
  return {
    name: props.name,
    parent: parentRef ? parentRef.name() : null
  };
}`;

const mapProjectTodoJxa = `todo => {
  const props = todo.properties();
  return {
    id: props.id,
    name: props.name,
    status: props.status,
    notes: props.notes,
    tags: todo.tagNames(),
    dueDate: props.dueDate ? props.dueDate.toISOString() : null,
    activationDate: props.activationDate ? props.activationDate.toISOString() : null,
  };
}`;

const mapProjectJxa = `project => {
  const props = project.properties();
  const areaRef = props.area;
  let area = null;
  if (areaRef) {
    const areaProps = areaRef.properties();
    area = { id: areaProps.id, name: areaProps.name, tags: areaRef.tagNames() };
  }
  return {
    id: props.id,
    name: props.name,
    status: props.status,
    notes: props.notes,
    tags: project.tagNames(),
    dueDate: props.dueDate ? props.dueDate.toISOString() : null,
    activationDate: props.activationDate ? props.activationDate.toISOString() : null,
    area,
    todos: project.toDos().map(${mapProjectTodoJxa})
  };
}`;

const mapAreaTodoJxa = `todo => {
  const props = todo.properties();
  return {
    id: props.id,
    name: props.name,
    status: props.status,
    notes: props.notes,
    tags: todo.tagNames(),
    dueDate: props.dueDate ? props.dueDate.toISOString() : null,
    activationDate: props.activationDate ? props.activationDate.toISOString() : null,
    isProject: props.pcls === "project",
  };
}`;

const mapAreaJxa = `area => {
  const props = area.properties();
  return {
    id: props.id,
    name: props.name,
    tags: area.tagNames(),
    todos: area.toDos().map(${mapAreaTodoJxa})
  };
}`;

export type TagWithParent = {
  name: string;
  parent: string | null;
};

type CollectionMap = {
  tags: string[];
  tagsWithHierarchy: TagWithParent[];
  projects: Project[];
  areas: Area[];
  lists: List[];
};

const jxaFetches = [
  { name: 'tags', needs: ['tags'], expr: `things.tags().map(${mapTagJxa})` },
  { name: 'tagsWithHierarchy', needs: ['tagsWithHierarchy'], expr: `things.tags().map(${mapTagWithHierarchyJxa})` },
  { name: 'projects', needs: ['projects', 'lists'], expr: `things.projects().map(${mapProjectJxa})` },
  { name: 'areas', needs: ['areas', 'lists'], expr: `things.areas().map(${mapAreaJxa})` },
];

export async function getCollections<K extends keyof CollectionMap>(...keys: K[]): Promise<Pick<CollectionMap, K>> {
  const keySet = new Set<string>(keys);

  const script = [
    `const things = Application('${preferences.thingsAppIdentifier}');`,
    `const result = {};`,
    ...jxaFetches
      .filter(({ needs }) => needs.some((k) => keySet.has(k)))
      .map(({ name, expr }) => `result.${name} = ${expr};`),
    `return result;`,
  ].join('\n');

  const raw = await executeJxa(script, `Get ${keys.join(', ')}`);

  return Object.fromEntries(
    keys.map((key) => [key, key === 'lists' ? organizeLists(raw.projects, raw.areas) : raw[key]]),
  ) as Pick<CollectionMap, K>;
}

function organizeLists(projects: Project[] = [], areas: Area[] = []): List[] {
  const projectsWithoutAreas = projects
    .filter((project) => !project.area)
    .map((project) => ({ ...project, type: 'project' as const }));

  const organizedAreasAndProjects: List[] = [];
  areas.forEach((area) => {
    organizedAreasAndProjects.push({ ...area, type: 'area' as const });

    const associatedProjects = projects
      .filter((project) => project.area && project.area.id === area.id)
      .map((project) => ({ ...project, type: 'project' as const }));
    organizedAreasAndProjects.push(...associatedProjects);
  });

  return [...projectsWithoutAreas, ...organizedAreasAndProjects];
}

export async function silentlyOpenThingsURL(url: string) {
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
