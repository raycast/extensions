import { Todo } from "./todo";
import { ActionPanel, Icon, List } from "@raycast/api";
import { ToggleTodoAction } from "./todo-toggle.component";
import { EditTodoAction } from "./todo-edit.component";
import { TogglePriority } from "./todo-toggle-priority.component";
import { CreateTodoAction, CreateTopPriorityTodoAction } from "./todo-create.component";
import { GetAccessories } from "./todo-list-accessories";
import { RestoreBackupAction, ShowBackupsAction } from "./backup-actions.component";

export function TodoListItems(props: {
  todos: Todo[],
  OnCreate: (todo: Todo) => void,
  OnEdit: (index: number, todo: Partial<Todo>) => void,
  OnToggle: (index: number) => void,
  searchText: string,
  title: string,
  set_todos: (todo: Todo[]) => void,
  set_dones: (todo: Todo[]) => void
}) {

  return (
    <List.Section title={props.title}
                  subtitle={`ongoing ${props.title.toLowerCase()}: ${props.todos.length}`}>
      {
        props.todos.map((todo, index) => (
            <List.Item key={todo.id}
                       icon={todo.isCompleted ? Icon.Checkmark : Icon.Circle}
                       title={todo.title}
                       actions={
                         <ActionPanel>
                           <ActionPanel.Section>
                             <ToggleTodoAction todo={todo}
                                               onToggle={() => props.OnToggle(index)} />
                             <EditTodoAction todo={todo}
                                             onUpdate={(todo: Partial<Todo>) => props.OnEdit(index, todo)} />
                           </ActionPanel.Section>
                           <ActionPanel.Section>

                             <TogglePriority todo={todo}
                                             onToggle={() => props.OnEdit(index, { urgent: !todo.urgent })}
                                             priority_type="urgent" />
                             <TogglePriority todo={todo}
                                             onToggle={() => props.OnEdit(index, { important: !todo.important })}
                                             priority_type="important" />
                             <TogglePriority todo={todo}
                                             onToggle={() => props.OnEdit(index, { quick: !todo.quick })}
                                             priority_type="quick" />
                           </ActionPanel.Section>
                           <ActionPanel.Section>
                             <CreateTodoAction onCreate={props.OnCreate}
                                               defaultTitle={props.searchText} />
                             <CreateTopPriorityTodoAction onCreate={props.OnCreate}
                                                          defaultTitle={props.searchText} />
                             <ShowBackupsAction />
                             <RestoreBackupAction set_dones={props.set_dones} set_todos={props.set_todos} />
                           </ActionPanel.Section>
                         </ActionPanel>
                       }
                       accessories={GetAccessories(todo)}

            />
          )
        )
      }
    </List.Section>
  );
}