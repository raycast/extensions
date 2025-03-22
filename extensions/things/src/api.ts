import { exec } from 'child_process';
import { promisify } from 'util';

import { showToast, Toast, getPreferenceValues, openExtensionPreferences } from '@raycast/api';
import { runAppleScript } from '@raycast/utils';
import qs from 'qs';

export const preferences: Preferences = getPreferenceValues<Preferences>();

export type TodoGroup = {
  id: string;
  name: string;
  tags: string;
  area?: TodoGroup;
};

export type Todo = {
  id: string;
  name: string;
  status: 'open' | 'completed' | 'canceled';
  tags: string;
  project?: TodoGroup;
  area?: TodoGroup;
  dueDate: string;
  activationDate: string;
  notes: string;
};

export type CommandListName = 'inbox' | 'today' | 'anytime' | 'upcoming' | 'someday';

export const executeJxa = async (script: string) => {
  try {
    const result = await runAppleScript(`(function(){${script}})()`, {
      humanReadableOutput: false,
      language: 'JavaScript',
    });
    return JSON.parse(result);
  } catch (err: unknown) {
    if (typeof err === 'string') {
      const message = err.replace('execution error: Error: ', '');
      if (message.match(/Application can't be found/)) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Application not found',
          message: 'Things must be running',
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: 'Something went wrong',
          message: message,
        });
      }
    }
  }
};

export const thingsNotRunningError = `
  ## Things Not Running
  Please make sure Things is installed and running before using this extension.
  
  ### But my Things app is running!
  If Things is running, you may need to grant Raycast access to Things in *System Settings > Privacy & Security > Automation > Raycast > Things*
`;

const commandListNameToListIdMapping: Record<CommandListName, string> = {
  inbox: 'TMInboxListSource',
  today: 'TMTodayListSource',
  anytime: 'TMNextListSource',
  upcoming: 'TMCalendarListSource',
  someday: 'TMSomedayListSource',
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
    project: todo.project() && {
      id: todo.project().id(),
      name: todo.project().name(),
      tags: todo.project().tagNames(),
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
`);
};

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

export const getTags = (): Promise<string[]> =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  return things.tags().map(tag => tag.name());
`);

type Project = {
  id: string;
  name: string;
  area?: { id: string } | null;
};

export const getProjects = async (): Promise<Project[]> => {
  return executeJxa(`
    const things = Application('${preferences.thingsAppIdentifier}');
    const projects = things.projects();

    return projects.map(project => ({
      id: project.id(),
      name: project.name(),
      area: project.area() && {
        id: project.area().id(),
      },
    }));
  `);
};

type Area = {
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
  const projects = await getProjects();
  const areas = await getAreas();

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

export type UpdateTodoParams = {
  title?: string;
  notes?: string;
  'prepend-notes'?: string;
  'append-notes'?: string;
  when?: string | null;
  deadline?: string;
  tags?: string;
  'add-tags'?: string;
  'checklist-items'?: string;
  'prepend-checklist-items'?: string;
  'append-checklist-items'?: string;
  'list-id'?: string;
  list?: string;
  'heading-id'?: string;
  heading?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
  duplicate?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
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
