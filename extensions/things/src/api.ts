import { exec } from 'child_process';
import { promisify } from 'util';

import { showToast, Toast, getPreferenceValues, openExtensionPreferences } from '@raycast/api';
import { runAppleScript } from '@raycast/utils';
import qs from 'qs';
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

export const preferences: Preferences = getPreferenceValues<Preferences>();

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
        tags: todo.project().area().tagNames(),
      },
    },
    area: todo.area() && {
      id: todo.area().id(),
      name: todo.area().name(),
      tags: todo.area().tagNames(),
    },
  }));
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
const mapTagJxa = `tag => tag.name()`;

const mapProjectTodoJxa = `todo => ({
  id: todo.id(),
  name: todo.name(),
  status: todo.status(),
  notes: todo.notes(),
  tags: todo.tagNames(),
  dueDate: todo.dueDate() && todo.dueDate().toISOString(),
  activationDate: todo.activationDate() && todo.activationDate().toISOString(),
})`;

const mapProjectJxa = `project => ({
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
    tags: project.area().tagNames(),
  },
  todos: project.toDos().map(${mapProjectTodoJxa})
})`;

const mapAreaTodoJxa = `todo => ({
  id: todo.id(),
  name: todo.name(),
  status: todo.status(),
  notes: todo.notes(),
  tags: todo.tagNames(),
  dueDate: todo.dueDate() && todo.dueDate().toISOString(),
  activationDate: todo.activationDate() && todo.activationDate().toISOString(),
  isProject: todo.properties().pcls === "project",
})`;

const mapAreaJxa = `area => ({
  id: area.id(),
  name: area.name(),
  tags: area.tagNames(),
  todos: area.toDos().map(${mapAreaTodoJxa})
})`;

export const getTags = (): Promise<string[]> =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  return things.tags().map(${mapTagJxa});
`,
    'Get tags',
  );

export const getProjects = async (): Promise<Project[]> => {
  return executeJxa(
    `
    const things = Application('${preferences.thingsAppIdentifier}');
    return things.projects().map(${mapProjectJxa});
  `,
    'Get projects',
  );
};

export const getAreas = async (): Promise<Area[]> => {
  return executeJxa(
    `
    const things = Application('${preferences.thingsAppIdentifier}');
    return things.areas().map(${mapAreaJxa});
  `,
    'Get areas',
  );
};

export const getTagsProjectsAndAreas = async (): Promise<{
  tags: string[];
  projects: Project[];
  areas: Area[];
}> => {
  return executeJxa(
    `
    const things = Application('${preferences.thingsAppIdentifier}');

    const tags = things.tags().map(${mapTagJxa});
    const projects = things.projects().map(${mapProjectJxa});
    const areas = things.areas().map(${mapAreaJxa});

    return { tags, projects, areas };
  `,
    'Get tags, projects, and areas',
  );
};

export const getListsAndTags = async (): Promise<{ lists: List[]; tags: string[] }> => {
  const { tags, projects, areas } = await getTagsProjectsAndAreas();

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

  const lists = [...projectsWithoutAreas, ...organizedAreasAndProjects];

  return { lists, tags };
};

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

export async function silentlyOpenThingsURL(url: string) {
  const asyncExec = promisify(exec);
  await asyncExec(`open -g "${url}"`);
}

export async function updateTodo(id: string, todoParams: UpdateTodoParams) {
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

export async function updateProject(id: string, projectParams: UpdateProjectParams) {
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

export async function addTodo(todoParams: AddTodoParams) {
  await silentlyOpenThingsURL(`things:///add?${qs.stringify(todoParams)}`);
}

export async function addProject(projectParams: AddProjectParams) {
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
