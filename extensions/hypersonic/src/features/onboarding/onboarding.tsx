import { AuthorizationAction } from './components/authorization-action'
import { CompleteTodoAction } from '@/components/complete-todo-action'
import { CopyToDoAction } from '@/components/copy-todo-action'
import { DeleteTodoAction } from '@/components/delete-todo-action'
import { RemindAction } from '@/components/remind-todo-action'
import { SetLabelAction } from '@/components/set-todo-label-action'
import { useOnboarding } from './hooks/use-onboarding'
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api'
import { createAccessoriesArray } from '@/utils/create-accessories-array'

export function Onboarding() {
  const {
    todos,
    tags,
    searchText,
    setSearchText,
    handleCreate,
    handleComplete,
    handleSetTag,
    handleSetDate,
    handleDelete,
  } = useOnboarding()

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or create task"
    >
      {searchText ? (
        <List.Item
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          title={`Create "${searchText}"`}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Plus}
                title="Create Task"
                onAction={handleCreate}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {todos.map((todo) => (
        <List.Item
          key={todo.id}
          icon={Icon.Circle}
          title={todo.title}
          accessories={createAccessoriesArray({
            todo,
            projectsById: {},
          })}
          actions={
            <ActionPanel>
              <CompleteTodoAction todo={todo} onComplete={handleComplete} />
              <ActionPanel.Section>
                <RemindAction todo={todo} onSetDate={handleSetDate} />
                <SetLabelAction
                  todo={todo}
                  tags={tags}
                  onSetLabel={handleSetTag}
                />
                {todo.contentUrl ? (
                  <Action.OpenInBrowser
                    title="Open Link"
                    icon={Icon.Link}
                    url={todo.contentUrl}
                    shortcut={{ modifiers: ['cmd'], key: 'e' }}
                  />
                ) : null}
                <CopyToDoAction todo={todo} />
                <DeleteTodoAction todo={todo} onDelete={handleDelete} />
              </ActionPanel.Section>
              <AuthorizationAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
