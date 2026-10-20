import { Action, Icon } from '@raycast/api';
import { AddNewTodo } from '../add-new-todo';
import type { CommandListName } from '../types';

export default function TodoListActions({
  searchText,
  commandListName,
}: {
  searchText: string;
  commandListName: CommandListName;
}) {
  return (
    <>
      <Action.Push
        icon={Icon.Plus}
        title="Add New To-Do"
        target={<AddNewTodo title={searchText} commandListName={commandListName} />}
      />
      <Action.OpenInBrowser
        title="Search in Things"
        icon={Icon.MagnifyingGlass}
        url={`things:///search?query=${encodeURIComponent(searchText)}`}
      />
    </>
  );
}
