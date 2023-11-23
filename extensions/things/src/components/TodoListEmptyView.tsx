import { Action, ActionPanel, Icon, List } from '@raycast/api';

import { AddNewTodo } from '../add-new-todo';

type TodoListEmptyViewProps = {
  searchText: string;
  commandListName: string;
};

export default function TodoListEmptyView({ searchText, commandListName }: TodoListEmptyViewProps) {
  return (
    <List.EmptyView
      title="No to-dos found."
      description="Press ⌘ + K to create a new to-do or search in Things"
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Plus}
            title="Add New To-Do"
            target={<AddNewTodo title={searchText} commandListName={commandListName} />}
          />

          <Action.OpenInBrowser
            title="Search in Things"
            icon={Icon.MagnifyingGlass}
            url={`things:///search?query=${searchText}`}
          />
        </ActionPanel>
      }
    />
  );
}
