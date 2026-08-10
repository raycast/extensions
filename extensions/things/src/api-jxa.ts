import { runAppleScript } from '@raycast/utils';
import type {
  CommandListName,
  Todo,
  TodoSummary,
  TodoDetails,
  ProjectDetails,
  AreaDetails,
  CollectionMap,
  QuickFindData,
} from './types';
import { organizeLists } from './helpers';

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
    // JSON.stringify runs inside JXA itself (rather than relying on osascript's own
    // object serialization) so undefined-valued keys are dropped per the JSON spec,
    // instead of leaking as a literal `undefined` token that a naive string-replace
    // could mistake for one occurring inside user-authored text (name/notes).
    const result = await runAppleScript(`JSON.stringify((function(){${script}})())`, {
      language: 'JavaScript',
      timeout: 60 * 1000, // 60 seconds
    });

    // Some calls only update data and don't return anything
    if (!result) {
      return;
    }

    return JSON.parse(result);
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

export function escapeJxa(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Formats a JXA Date (local midnight) as `YYYY-MM-DD` without the UTC shift toISOString() causes.
const formatLocalDateJxa = `(d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
})`;

// JXA map templates — reusable across individual and combined queries
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
    notes: props.notes || '',
    tags: todo.tagNames(),
    areaTags: null,
    dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : '',
    activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : '',
    creationDate: props.creationDate ? props.creationDate.toISOString() : '',
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
    notes: props.notes || '',
    tags: project.tagNames(),
    dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : '',
    activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : '',
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
    notes: props.notes || '',
    tags: todo.tagNames(),
    areaTags: null,
    dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : '',
    activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : '',
    creationDate: props.creationDate ? props.creationDate.toISOString() : '',
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

/** Build the JXA snippet that defines `todos` for queryTodosJxa, scoped to the given filter. */
function buildTodosSourceJxa(opts: {
  listName?: string | null;
  projectId?: string | null;
  areaId?: string | null;
}): string {
  if (opts.projectId) {
    const id = escapeJxa(opts.projectId);
    return `const projectMatches = things.projects.whose({id: '${id}'})();
  const todos = projectMatches.length ? projectMatches[0].toDos() : [];`;
  }
  if (opts.areaId) {
    const id = escapeJxa(opts.areaId);
    return `const areaMatches = things.areas.whose({id: '${id}'})();
  const todos = areaMatches.length ? areaMatches[0].toDos() : [];`;
  }
  if (opts.listName) {
    const listId = commandListNameToListIdMapping[opts.listName as CommandListName] ?? escapeJxa(opts.listName);
    return `const todos = things.lists.byId('${listId}').toDos();`;
  }
  return `const todos = things.toDos();`;
}

export async function queryTodosJxa(
  appId: string,
  opts: {
    listName?: string | null;
    projectId?: string | null;
    areaId?: string | null;
  } = {},
): Promise<TodoSummary[]> {
  return executeJxa(
    `
  const things = Application('${appId}');
  ${buildTodosSourceJxa(opts)}
  return todos.map(todo => {
    const props = todo.properties();
    const projectRef = props.project;
    const areaRef = props.area;
    const s = props.status;
    return {
      id: props.id,
      name: props.name,
      status: s !== 'open' ? s : undefined,
      dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : undefined,
      dueDateIsRecurring: false,
      activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : undefined,
      isRecurring: false,
      projectName: projectRef ? projectRef.name() : undefined,
      projectId: projectRef ? projectRef.id() : undefined,
      areaName: areaRef ? areaRef.name() : undefined,
      areaId: areaRef ? areaRef.id() : undefined,
    };
  });
`,
    `Query todos`,
  );
}

export async function queryTodoDetailsJxa(appId: string, todoId: string): Promise<TodoDetails | null> {
  const result = await executeJxa(
    `
  const things = Application('${appId}');
  const matches = things.toDos.whose({id: '${escapeJxa(todoId)}'})();
  if (!matches.length) return null;
  const todo = matches[0];
  const props = todo.properties();
  const projectRef = props.project;
  const areaRef = props.area;
  return {
    id: props.id,
    name: props.name,
    status: props.status,
    notes: props.notes || '',
    tags: (todo.tagNames() || '').split(', ').filter(t => t),
    dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : undefined,
    dueDateIsRecurring: false,
    activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : undefined,
    isRecurring: false,
    projectName: projectRef ? projectRef.name() : undefined,
    projectId: projectRef ? projectRef.id() : undefined,
    areaName: areaRef ? areaRef.name() : undefined,
    areaId: areaRef ? areaRef.id() : undefined,
    checklistItems: null,
  };
`,
    `Get todo details`,
  );
  if (!result) return null;
  return result as TodoDetails;
}

export async function queryTodosDetailsJxa(appId: string, todoIds: string[]): Promise<TodoDetails[]> {
  if (!todoIds.length) return [];
  const idList = todoIds.map((id) => `'${escapeJxa(id)}'`).join(', ');
  const results: TodoDetails[] = await executeJxa(
    `
  const things = Application('${appId}');
  const ids = [${idList}];
  return ids.map(id => {
    const matches = things.toDos.whose({id: id})();
    if (!matches.length) return null;
    const todo = matches[0];
    const props = todo.properties();
    const projectRef = props.project;
    const areaRef = props.area;
    return {
      id: props.id,
      name: props.name,
      status: props.status,
      notes: props.notes || '',
      tags: (todo.tagNames() || '').split(', ').filter(t => t),
      dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : undefined,
      dueDateIsRecurring: false,
      activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : undefined,
      isRecurring: false,
      projectName: projectRef ? projectRef.name() : undefined,
      projectId: projectRef ? projectRef.id() : undefined,
      areaName: areaRef ? areaRef.name() : undefined,
      areaId: areaRef ? areaRef.id() : undefined,
      checklistItems: null,
    };
  }).filter(t => t !== null);
`,
    `Get todos details`,
  );
  return results ?? [];
}

export async function searchTodosJxa(appId: string, query: string): Promise<TodoSummary[]> {
  const escaped = escapeJxa(query);
  return executeJxa(
    `
  const things = Application('${appId}');
  const q = '${escaped}'.toLowerCase();
  const todos = things.toDos().filter(todo => {
    const props = todo.properties();
    return props.status === 'open' &&
      ((props.name || '').toLowerCase().includes(q) || (props.notes || '').toLowerCase().includes(q));
  });
  return todos.map(todo => {
    const props = todo.properties();
    const projectRef = props.project;
    const areaRef = props.area;
    return {
      id: props.id,
      name: props.name,
      dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : undefined,
      dueDateIsRecurring: false,
      activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : undefined,
      isRecurring: false,
      projectName: projectRef ? projectRef.name() : undefined,
      projectId: projectRef ? projectRef.id() : undefined,
      areaName: areaRef ? areaRef.name() : undefined,
      areaId: areaRef ? areaRef.id() : undefined,
    };
  });
`,
    `Search todos`,
  );
}

export async function queryProjectDetailsJxa(appId: string, projectId: string): Promise<ProjectDetails | null> {
  const result = await executeJxa(
    `
  const things = Application('${appId}');
  const matches = things.projects.whose({id: '${escapeJxa(projectId)}'})();
  if (!matches.length) return null;
  const project = matches[0];
  const props = project.properties();
  const areaRef = props.area;
  const todoCount = project.toDos().filter(t => t.status() === 'open').length;
  return {
    id: props.id,
    name: props.name,
    status: props.status,
    notes: props.notes || '',
    tags: (project.tagNames() || '').split(', ').filter(t => t),
    dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : undefined,
    activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : undefined,
    areaId: areaRef ? areaRef.id() : undefined,
    areaName: areaRef ? areaRef.name() : undefined,
    todoCount,
  };
`,
    `Get project details`,
  );
  if (!result) return null;
  return result as ProjectDetails;
}

export async function queryAreaDetailsJxa(appId: string, areaId: string): Promise<AreaDetails | null> {
  const result = await executeJxa(
    `
  const things = Application('${appId}');
  const matches = things.areas.whose({id: '${escapeJxa(areaId)}'})();
  if (!matches.length) return null;
  const area = matches[0];
  const props = area.properties();
  const todos = area.toDos().filter(t => t.status() === 'open' && !t.project());
  const projects = area.projects().filter(p => p.status() === 'open');
  return {
    id: props.id,
    name: props.name,
    tags: (area.tagNames() || '').split(', ').filter(t => t),
    projectCount: projects.length,
    todoCount: todos.length,
  };
`,
    `Get area details`,
  );
  if (!result) return null;
  return result as AreaDetails;
}

export const getListTodosViaJXA = (appId: string, commandListName: CommandListName): Promise<Todo[]> => {
  return executeJxa(
    `
  const things = Application('${appId}');
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
        notes: projectProps.notes || '',
        tags: projectRef.tagNames(),
        dueDate: projectProps.dueDate ? ${formatLocalDateJxa}(projectProps.dueDate) : '',
        activationDate: projectProps.activationDate ? ${formatLocalDateJxa}(projectProps.activationDate) : '',
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
      notes: props.notes || '',
      tags: todo.tagNames(),
      dueDate: props.dueDate ? ${formatLocalDateJxa}(props.dueDate) : '',
      activationDate: props.activationDate ? ${formatLocalDateJxa}(props.activationDate) : '',
      creationDate: props.creationDate ? props.creationDate.toISOString() : '',
      isProject: props.pcls === "project",
      areaTags: areaTags || null,
      project,
      area,
    };
  });
`,
    `Get ${commandListName} list`,
  );
};

const jxaFetches = [
  { name: 'tags', needs: ['tags'], expr: `things.tags().map(${mapTagJxa})` },
  { name: 'tagsWithHierarchy', needs: ['tagsWithHierarchy'], expr: `things.tags().map(${mapTagWithHierarchyJxa})` },
  { name: 'projects', needs: ['projects', 'lists'], expr: `things.projects().map(${mapProjectJxa})` },
  { name: 'areas', needs: ['areas', 'lists'], expr: `things.areas().map(${mapAreaJxa})` },
];

export async function getCollectionsJxa<K extends keyof CollectionMap>(
  appId: string,
  ...keys: K[]
): Promise<Pick<CollectionMap, K>> {
  const keySet = new Set<string>(keys);

  const script = [
    `const things = Application('${appId}');`,
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

export const getQuickFindDataJXA = async (appId: string): Promise<QuickFindData> => {
  return executeJxa(
    `
    const things = Application('${appId}');
    const areas = things.areas().map(area => ({ id: area.id(), name: area.name() }));
    const projects = things.projects().map(project => ({
      id: project.id(), name: project.name(),
      areaName: project.area() ? project.area().name() : undefined,
    }));
    const todos = things.toDos().filter(t => t.status() === 'open').map(todo => ({
      id: todo.id(),
      name: todo.name(),
      status: 'open',
      projectName: todo.project() ? todo.project().name() : undefined,
      areaName: todo.area() ? todo.area().name() : (todo.project() ? todo.project().area()?.name() : undefined),
    }));
    return { areas, projects, todos };
  `,
    'Get quick find data',
  );
};
