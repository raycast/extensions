import {
  Icon,
  ActionPanel,
  showToast,
  Action,
  Toast,
  Color,
  confirmAlert,
  Keyboard,
  AI,
  environment,
} from '@raycast/api';

import { AddNewTodo } from '../add-new-todo';
import { setTodoProperty, deleteProject, deleteTodo, updateTodo, updateProject, handleError } from '../api';
import { getChecklistItemsWithAI, listItems, statusIcons } from '../helpers';
import { capitalize } from '../utils';

import EditTodo from './EditTodo';
import { Todo, List as TList, CommandListName, UpdateTodoParams } from '../types';

// Match URLs with protocols, with optional //
const URL_REGEX = /([a-zA-Z][a-zA-Z0-9.+-]+):(?:\/\/\S+|%\S+)/;

type TodoListItemActionsProps = {
  todo: Todo;
  commandListName: CommandListName;
  tags?: string[];
  lists?: TList[];
  refreshTodos: () => void;
};

export default function TodoListItemActions({
  todo,
  refreshTodos,
  commandListName,
  tags,
  lists,
}: TodoListItemActionsProps) {
  const availableTags =
    tags?.filter((tag) => {
      return !todo.tags?.includes(tag);
    }) ?? [];

  const area = todo.area || todo.project?.area;

  const notesURL = todo.notes.match(URL_REGEX)?.[0];

  async function updateAction(args: UpdateTodoParams, successToastOptions: Toast.Options) {
    try {
      if (todo.isProject) {
        await updateProject(todo.id, args);
      } else {
        await updateTodo(todo.id, args);
      }
      await showToast({
        style: Toast.Style.Success,
        title: successToastOptions.title,
        message: successToastOptions.message ?? todo.name,
      });
      refreshTodos();
    } catch (error) {
      handleError(error);
    }
  }

  async function generateChecklistWithAI() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: 'Generating checklist',
      message: todo.name,
    });

    const items = await getChecklistItemsWithAI(todo.name, todo.notes);

    if (
      await confirmAlert({
        title: 'Add these items to the checklist?',
        message: items.trim(),
        icon: { source: Icon.Stars, tintColor: Color.Yellow },
      })
    ) {
      await updateAction({ 'append-checklist-items': items.trim() }, { title: 'Added checklist items' });
    } else {
      await toast.hide();
    }
  }

  async function makeTodoActionable() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: 'Making to-do actionable',
      message: todo.name,
    });

    const newTitle = (
      await AI.ask(
        `Make a task title more actionable. Here are some examples:
Yoga → Do a yoga session
Fix bug → Investigate and fix the bug
Write post → Write a blog post about …

Return the result in the same language than the task's title (e.g if the task title is written in French, the checklist should be written in French as well)
Here's the task title you need to make actionable: "${todo.name}
${todo.notes ? `For additional context, here are the task's notes: "${todo.notes}"` : ''}

New title:
        `,
        { creativity: 0.2 },
      )
    ).trim();

    if (
      await confirmAlert({
        title: "Change to-do's title?",
        message: `The new title will be: "${newTitle}"`,
        icon: { source: Icon.Stars, tintColor: Color.Yellow },
      })
    ) {
      await updateAction({ title: newTitle }, { title: 'Made to-do title actionable', message: newTitle });
    } else {
      toast.hide();
    }
  }

  async function schedule(when: string) {
    await updateAction({ when }, { title: when === 'anytime' ? 'Removed date' : `Scheduled to-do` });
  }

  async function moveTo(listId: string) {
    await updateAction({ 'list-id': listId }, { title: 'Made to-do title actionable', message: 'Moved to-do' });
  }

  async function addTag(tag: string) {
    await updateAction({ 'add-tags': tag }, { title: 'Added tag' });
  }

  async function setDeadline(date: string | null) {
    const title = date === null ? 'Removed deadline' : 'Set deadline';
    const deadline = date === null ? '' : date;

    await updateAction({ deadline }, { title });
  }

  async function deleteToDoOrProject() {
    const isProject = todo.isProject;

    let title = isProject ? 'Delete Project' : 'Delete To-Do';
    const message = isProject
      ? 'Are you sure you want to delete this project?'
      : 'Are you sure you want to delete this to-do?';
    const deleteFunction = isProject ? deleteProject : deleteTodo;

    if (
      await confirmAlert({
        title,
        message,
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      await deleteFunction(todo.id);

      title = isProject ? 'Deleted project' : 'Deleted to-do';

      await showToast({
        style: Toast.Style.Success,
        title,
        message: todo.name,
      });
      refreshTodos();
    }
  }

  function formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const datePart = `${year}-${month}-${day}`;

    // If the user picked a full day, we avoid providing the time, as
    // Things leverages the time part to understand whether a reminder
    // should be set.
    if (Action.PickDate.isFullDay(date)) {
      return datePart;
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${datePart}@${hours}:${minutes}`;
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title={todo.name}>
        <Action.OpenInBrowser title="Open in Things" icon="things-flat.png" url={`things:///show?id=${todo.id}`} />
        {todo.status !== 'completed' && (
          <Action
            title="Mark as Completed"
            icon={statusIcons.completed}
            onAction={async () => {
              await setTodoProperty(todo.id, 'status', 'completed');
              await showToast({
                style: Toast.Style.Success,
                title: 'Marked as Completed',
                message: todo.name,
              });
              refreshTodos();
            }}
          />
        )}

        {todo.status !== 'canceled' && (
          <Action
            title="Mark as Canceled"
            icon={statusIcons.canceled}
            shortcut={{ modifiers: ['opt', 'cmd'], key: 'k' }}
            onAction={async () => {
              await setTodoProperty(todo.id, 'status', 'canceled');
              await showToast({
                style: Toast.Style.Success,
                title: 'Marked as Canceled',
                message: todo.name,
              });
              refreshTodos();
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <ActionPanel.Submenu title="Schedule" icon={Icon.Calendar} shortcut={{ modifiers: ['cmd'], key: 's' }}>
          <Action {...listItems.today} onAction={() => schedule('today')} />
          <Action {...listItems.evening} onAction={() => schedule('evening')} />
          <Action {...listItems.tomorrow} onAction={() => schedule('tomorrow')} />
          <Action.PickDate
            title="Date…"
            icon={Icon.Calendar}
            min={new Date()}
            onChange={(date) => {
              if (!date) {
                return schedule('anytime');
              }

              return schedule(formatDateTime(date));
            }}
            type={Action.PickDate.Type.DateTime}
          />
          <Action {...listItems.someday} onAction={() => schedule('someday')} />
        </ActionPanel.Submenu>

        {lists && lists.length > 0 ? (
          <ActionPanel.Submenu
            title="Move to"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'm' }}
          >
            {lists.map((list) => {
              return <Action {...listItems.list(list)} key={list.id} onAction={() => moveTo(list.id)} />;
            })}
          </ActionPanel.Submenu>
        ) : null}

        <Action.Push
          title="Edit To-Do"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<EditTodo todo={todo} refreshTodos={refreshTodos} />}
        />

        {availableTags && availableTags.length > 0 ? (
          <ActionPanel.Submenu title="Add Tag" icon={Icon.Tag} shortcut={{ modifiers: ['cmd', 'shift'], key: 't' }}>
            {availableTags.map((tag) => {
              return <Action key={tag} title={tag} onAction={() => addTag(tag)} />;
            })}
          </ActionPanel.Submenu>
        ) : null}

        <Action.PickDate
          title="Set Deadline"
          icon={Icon.Flag}
          shortcut={{ modifiers: ['cmd', 'shift'], key: 'd' }}
          min={new Date()}
          onChange={(date) => {
            return setDeadline(date ? formatDateTime(date) : null);
          }}
          type={Action.PickDate.Type.Date}
        />

        {environment.canAccess(AI) && (
          <Action
            title="Generate Checklist with AI"
            icon={Icon.BulletPoints}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
            onAction={generateChecklistWithAI}
          />
        )}

        <Action
          title="Make To-Do Actionable with AI"
          icon={Icon.Text}
          shortcut={{ modifiers: ['cmd', 'shift'], key: 'a' }}
          onAction={makeTodoActionable}
        />

        <Action
          title="Delete"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={deleteToDoOrProject}
        />
      </ActionPanel.Section>

      {notesURL && (
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open URL from Notes"
            url={notesURL}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'o' }}
          />
          <Action.CopyToClipboard title="Copy URL from Notes" content={notesURL} />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Formatted To-Do URL"
          content={{
            html: `<a href="things:///show?id=${todo.id}" title="${todo.name}">${todo.name}</a>`,
            text: todo.name,
          }}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        <Action.CopyToClipboard title="Copy To-Do URL" content={`things:///show?id=${todo.id}`} />
        <Action.CopyToClipboard
          title="Copy To-Do Title"
          content={todo.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.CopyToClipboard title="Copy To-Do Notes" content={todo.notes} />
      </ActionPanel.Section>

      {todo.project && (
        <ActionPanel.Section title={todo.project.name}>
          <Action.OpenInBrowser
            title="Open Project in Things"
            icon="things-flat.png"
            shortcut={{ modifiers: ['cmd'], key: 'o' }}
            url={`things:///show?id=${todo.project.id}`}
          />
          <Action.CopyToClipboard title="Copy Project URL" content={`things:///show?id=${todo.project.id}`} />
        </ActionPanel.Section>
      )}
      {area && (
        <ActionPanel.Section title={area.name}>
          <Action.OpenInBrowser
            title="Open Area in Things"
            icon="things-flat.png"
            shortcut={{ modifiers: ['opt'], key: 'o' }}
            url={`things:///show?id=${area.id.replace('THMAreaParentSource/', '')}`}
          />
          <Action.CopyToClipboard
            title="Copy Area URL"
            content={`things:///show?id=${area.id.replace('THMAreaParentSource/', '')}`}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title={`${capitalize(commandListName)} List`}>
        <Action.OpenInBrowser
          title={`Open ${capitalize(commandListName)} List in Things`}
          icon="things-flat.png"
          shortcut={{ modifiers: ['ctrl'], key: 'o' }}
          url={`things:///show?id=${commandListName.toLowerCase()}`}
        />
        <Action.Push
          title="Add New To-Do"
          icon={Icon.Plus}
          shortcut={{ modifiers: ['cmd'], key: 'n' }}
          target={<AddNewTodo commandListName={commandListName} />}
        />
        <Action.CopyToClipboard title="Copy List URL" content={`things:///show?id=${commandListName.toLowerCase()}`} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ['cmd'], key: 'r' }}
          onAction={refreshTodos}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
