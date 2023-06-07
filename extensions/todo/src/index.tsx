import { ActionPanel, getSelectedFinderItems, Icon, List } from '@raycast/api';
import { useEffect, useState } from 'react';
import { create_todo, edit_todo, has_text, Todo } from './todo';
import { load_todos, store_dones, store_todos } from './persist';
import { CreateTodoAction, CreateTopPriorityTodoAction } from './todo-create.component';
import { TodoListItems } from './todo-list-items.component';
import { to_backup } from './backup';
import { RestoreBackupAction } from './backup-actions.component';

export default function Command() {
  // todos
  const [todos, setTodos] = useState<Todo[]>([]);
  const [dones, setDones] = useState<Todo[]>([]);

  // the app is loading when loading todos
  const [loading, setLoading] = useState<boolean>(true);
  // filtering state
  const [searchText, setSearchText] = useState<string>('');
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [filteredDones, setFilteredDones] = useState<Todo[]>([]);

  if (loading) {
    void load_todos().then(([todos, dones]) => {
      if (loading) {
        setTodos(todos);
        setDones(dones);
        setLoading(false);
      }
    });
  }

  useEffect(() => {
    to_backup.next([todos, dones]);
  }, [todos, dones]);

  useEffect(() => {
    if (!loading) {
      void store_todos(todos);
    }
  }, [todos, loading]);

  useEffect(() => {
    if (!loading) {
      void store_dones(dones);
    }
  }, [dones, loading]);

  useEffect(() => {
    setFilteredTodos(todos.filter(has_text(searchText)));
  }, [todos, searchText]);

  useEffect(() => {
    setFilteredDones(dones.filter(has_text(searchText)));
  }, [dones, searchText]);

  function OnCreate(todo: Todo) {
    setTodos(create_todo(todo));
    setSearchText('');
  }

  function OnEdit(index: number, patch: Partial<Todo>) {
    setTodos(edit_todo(index, patch));
  }

  function OnComplete(index: number) {
    // check
    const todo = { ...todos[index], isCompleted: true };
    setTodos((todos) => todos.filter((t, i) => i !== index));
    setDones([todo, ...dones]);
  }

  function OnContinue(index: number) {
    // uncheck
    const todo = { ...dones[index], isCompleted: false };
    setDones((todos) => todos.filter((t, i) => i !== index));
    setTodos(create_todo(todo));
  }

  return (
    <List
      actions={
        <ActionPanel>
          <CreateTodoAction onCreate={OnCreate} defaultTitle={searchText} />
          <CreateTopPriorityTodoAction onCreate={OnCreate} defaultTitle={searchText} />
          <RestoreBackupAction set_dones={setDones} set_todos={setTodos} />
        </ActionPanel>
      }
      isLoading={loading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle='Start typing to search for To-dos'
      searchBarPlaceholder='Search To-dos'
    >
      {todos.length === 0 && searchText === '' && (
        <List.EmptyView
          icon={Icon.Tray}
          title='Create your first to-do'
          description='Press *cmd+n* to create your first to-do'
        />
      )}
      {todos.length !== 0 && filteredTodos.length === 0 && searchText !== '' && (
        <List.EmptyView
          icon={Icon.Tray}
          title='To-do not found'
          description='Press *cmd+n* to create a new to-do'
        />
      )}
      <TodoListItems
        todos={filteredTodos}
        OnCreate={OnCreate}
        OnEdit={OnEdit}
        OnToggle={OnComplete}
        searchText={searchText}
        title='To-dos'
        set_todos={setTodos}
        set_dones={setDones}
      />
      <TodoListItems
        todos={filteredDones}
        OnCreate={OnCreate}
        OnEdit={OnEdit}
        OnToggle={OnContinue}
        searchText={searchText}
        title='Completed To-dos'
        set_todos={setTodos}
        set_dones={setDones}
      />
    </List>
  );
}
