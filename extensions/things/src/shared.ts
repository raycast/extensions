import { showToast, Toast, getPreferenceValues } from '@raycast/api';
import osascript from 'osascript-tag';

type Preferences = {
  thingsAppIdentifier: string;
};

enum TodoStatus {
  open = 'open',
  completed = 'completed',
  canceled = 'canceled',
}

export interface Todo {
  id: string;
  name: string;
  status: TodoStatus;
  tags: string;
  project: TodoGroup;
  area: TodoGroup;
  dueDate: string;
  notes: string;
  // creationDate: string;
  // activationDate: string;
  // modificationDate: string;
  // completionDate: string;
  // cancellationDate: string;
}

export interface TodoGroup {
  id: string;
  name: string;
  tags: string;
  area?: TodoGroup;
}

export const preferences: Preferences = getPreferenceValues();

export const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
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

export enum ListName {
  Inbox = 'Inbox',
  Today = 'Today',
  Anytime = 'Anytime',
  Upcoming = 'Upcoming',
  Someday = 'Someday',
}

const listNameToListIdMapping = {
  Inbox: 'TMInboxListSource',
  Today: 'TMTodayListSource',
  Anytime: 'TMNextListSource',
  Upcoming: 'TMCalendarListSource',
  Someday: 'TMSomedayListSource',
};

export const getListTodos = (listName: ListName) =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  const todos = things.lists.byId('${listNameToListIdMapping[listName]}').toDos();
  return todos.map(todo => ({
    id: todo.id(),
    name: todo.name(),
    status: todo.status(),
    notes: todo.notes(),
    tags: todo.tagNames(),
    dueDate: todo.dueDate() && todo.dueDate().toISOString(),
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

export const getTodoGroupId = (todo: Todo) => todo.project?.id || todo.area?.id;
export const getTodoGroup = (todo: Todo) => todo.project || todo.area;
