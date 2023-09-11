import {
  MenuBarExtra,
  Icon,
  open,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
  openCommandPreferences,
  getPreferenceValues,
} from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { Todo, getListTodos, getLists, setTodoProperty, updateTodo } from './api';
import { listItems } from './helpers';

const TASK_NAME_LENGTH_LIMIT = 30;

export default function ShowTodayInMenuBar() {
  const { shouldShowShortcuts } = getPreferenceValues<Preferences.ShowTodayInMenuBar>();
  const { data: todos, isLoading, mutate } = useCachedPromise(() => getListTodos('today'));
  const { data: lists } = useCachedPromise(() => getLists());

  const tooltip = todos && todos.length > 0 ? todos[0].name : '';
  const title = tooltip.length > TASK_NAME_LENGTH_LIMIT ? tooltip.substring(0, TASK_NAME_LENGTH_LIMIT) + '…' : tooltip;

  async function completeTodo(todo: Todo) {
    await mutate(setTodoProperty(todo.id, 'status', 'completed'), {
      optimisticUpdate(data) {
        if (!data) return;
        return data.filter((t) => t.id !== todo.id);
      },
      shouldRevalidateAfter: false,
    });
    await showToast({ style: Toast.Style.Success, title: 'Marked as Completed' });
  }

  async function schedule(todo: Todo, when: string) {
    await updateTodo(todo.id, { when });
    await mutate();
    await showToast({ style: Toast.Style.Success, title: 'Scheduled to-do' });
  }

  async function moveTo(todo: Todo, listId: string) {
    await updateTodo(todo.id, { 'list-id': listId });
    await mutate();
    await showToast({ style: Toast.Style.Success, title: 'Moved to-do' });
  }

  return (
    <MenuBarExtra icon="things-icon.png" title={title} tooltip={tooltip} isLoading={isLoading}>
      {todos && todos.length > 0 ? (
        <>
          <MenuBarExtra.Item title="Complete" icon={Icon.CheckCircle} onAction={() => completeTodo(todos[0])} />
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Today" />
            {todos.map((todo) => (
              <MenuBarExtra.Submenu title={todo.name} key={todo.id}>
                <MenuBarExtra.Item title="Complete" icon={Icon.CheckCircle} onAction={() => completeTodo(todo)} />

                <MenuBarExtra.Item
                  title="Show in Things"
                  icon="things-icon.png"
                  onAction={() => {
                    open(`things:///show?id=${todo.id}`);
                  }}
                />

                <MenuBarExtra.Submenu title="Schedule" icon={Icon.Calendar}>
                  <MenuBarExtra.Item {...listItems.today} onAction={() => schedule(todo, 'today')} />
                  <MenuBarExtra.Item {...listItems.evening} onAction={() => schedule(todo, 'evening')} />
                  <MenuBarExtra.Item {...listItems.tomorrow} onAction={() => schedule(todo, 'tomorrow')} />
                  <MenuBarExtra.Item {...listItems.anytime} onAction={() => schedule(todo, 'anytime')} />
                  <MenuBarExtra.Item {...listItems.someday} onAction={() => schedule(todo, 'someday')} />
                </MenuBarExtra.Submenu>

                {lists && lists.length > 0 ? (
                  <MenuBarExtra.Submenu title="Move To" icon={Icon.ArrowRight}>
                    {lists.map((list) => {
                      return (
                        <MenuBarExtra.Item
                          key={list.id}
                          {...listItems.list(list)}
                          onAction={() => moveTo(todo, list.id)}
                        />
                      );
                    })}
                  </MenuBarExtra.Submenu>
                ) : null}
              </MenuBarExtra.Submenu>
            ))}
          </MenuBarExtra.Section>
        </>
      ) : (
        <MenuBarExtra.Item title="No to-dos for today." />
      )}

      {shouldShowShortcuts ? (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              {...listItems.inbox}
              shortcut={{ modifiers: ['cmd'], key: 'i' }}
              onAction={() => open('things:///show?id=inbox')}
            />
            <MenuBarExtra.Item
              {...listItems.today}
              shortcut={{ modifiers: ['cmd'], key: 't' }}
              onAction={() => open('things:///show?id=today')}
            />
            <MenuBarExtra.Item
              {...listItems.upcoming}
              shortcut={{ modifiers: ['cmd'], key: 'u' }}
              onAction={() => open('things:///show?id=upcoming')}
            />
            <MenuBarExtra.Item
              {...listItems.anytime}
              shortcut={{ modifiers: ['cmd'], key: 'a' }}
              onAction={() => open('things:///show?id=anytime')}
            />
            <MenuBarExtra.Item
              {...listItems.someday}
              shortcut={{ modifiers: ['cmd'], key: 's' }}
              onAction={() => open('things:///show?id=someday')}
            />
            <MenuBarExtra.Item
              {...listItems.logbook}
              shortcut={{ modifiers: ['cmd'], key: 'l' }}
              onAction={() => open('things:///show?id=logbook')}
            />
          </MenuBarExtra.Section>

          {lists && lists.length > 0 ? (
            <MenuBarExtra.Section>
              {lists.slice(0, 6).map((list) => (
                <MenuBarExtra.Item
                  key={list.id}
                  {...listItems.list(list)}
                  onAction={() => open(`things:///show?id=${encodeURIComponent(list.id)}`)}
                />
              ))}

              {lists.length > 6 ? (
                <MenuBarExtra.Submenu title="More" icon={Icon.Ellipsis}>
                  {lists.slice(6).map((list) => (
                    <MenuBarExtra.Item
                      key={list.id}
                      {...listItems.list(list)}
                      onAction={() => open(`things:///show?id=${encodeURIComponent(list.id)}`)}
                    />
                  ))}
                </MenuBarExtra.Submenu>
              ) : null}
            </MenuBarExtra.Section>
          ) : null}
        </>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add New To-Do"
          icon={Icon.Plus}
          shortcut={{ modifiers: ['cmd'], key: 'n' }}
          onAction={() => {
            launchCommand({ name: 'add-new-todo', type: LaunchType.UserInitiated, context: { list: 'today' } });
          }}
        />

        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ['cmd'], key: ',' }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
