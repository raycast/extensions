import { ActionPanel, List } from '@raycast/api';

import TodoListActions from './TodoListActions';
import { CommandListName } from '../types';

type TodoListEmptyViewProps = {
  searchText: string;
  commandListName: CommandListName;
};

export default function TodoListEmptyView({ searchText, commandListName }: TodoListEmptyViewProps) {
  return (
    <List.EmptyView
      title="No to-dos found."
      description="Press ⌘ + K to create a new to-do or search in Things"
      actions={
        <ActionPanel>
          <TodoListActions searchText={searchText} commandListName={commandListName} />
        </ActionPanel>
      }
    />
  );
}
