import { AuthorizationAction } from '@/components/authorization-action'
import { CompleteTodoAction } from '@/components/complete-todo-action'
import { CopyToDoAction } from '@/components/copy-todo-action'
import { CancelTodoAction } from '@/components/cancel-todo-action'
import { DeleteTodoAction } from '@/components/delete-todo-action'
import { RemindAction } from '@/components/remind-todo-action'
import { SetLabelAction } from '@/components/set-todo-label-action'
import { useOnboarding } from '@/hooks/use-onboarding'
import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
} from '@raycast/api'

export function Onboarding() {
  const {
    todos,
    tags,
    searchText,
    setSearchText,
    handleCreate,
    handleComplete,
    handleCancel,
    handleSetTag,
    handleSetDate,
    handleDelete,
    handleMoveUp,
    handleMoveDown,
  } = useOnboarding()

  const preferences = getPreferenceValues()

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter or create to-do"
    >
      {searchText ? (
        <List.Item
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          title={`Create "${searchText}"`}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Plus}
                title="Create To-do"
                onAction={handleCreate}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {todos.map((todo, index) => (
        <List.Item
          key={todo.id}
          icon={todo.isCompleted ? Icon.Checkmark : Icon.Circle}
          title={todo.title}
          accessories={
            todo.tag
              ? [
                  {
                    text: todo.tag.name,
                    icon: {
                      source: 'dot.png',
                      tintColor: todo.tag.color,
                    },
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <CompleteTodoAction todo={todo} onComplete={handleComplete} />
              <RemindAction todo={todo} onSetDate={handleSetDate} />
              <SetLabelAction
                todo={todo}
                tags={tags}
                onSetLabel={handleSetTag}
              />
              {preferences.property_cancel != '' ? (
                <CancelTodoAction todo={todo} onCancel={handleCancel} />
              ) : null}
              <Action
                icon={Icon.ChevronUp}
                title={'Move Up'}
                onAction={() => handleMoveUp(index)}
                shortcut={{ modifiers: ['shift'], key: 'arrowUp' }}
              />
              <Action
                icon={Icon.ChevronDown}
                title={'Move Down'}
                onAction={() => handleMoveDown(index)}
                shortcut={{ modifiers: ['shift'], key: 'arrowDown' }}
              />
              <DeleteTodoAction todo={todo} onDelete={handleDelete} />
              <ActionPanel.Section>
                {todo.contentUrl ? (
                  <Action.OpenInBrowser
                    title="View Link"
                    icon={Icon.Link}
                    url={todo.contentUrl}
                    shortcut={{ modifiers: ['cmd'], key: 'e' }}
                  />
                ) : null}
                <CopyToDoAction todo={todo} />
              </ActionPanel.Section>
              <AuthorizationAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
