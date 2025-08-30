import { AuthorizationAction } from './components/authorization-action'
import { CompleteTodoAction } from '@/components/complete-todo-action'
import { CopyToDoAction } from '@/components/copy-todo-action'
import { RemindAction } from '@/components/remind-todo-action'
import { SetLabelAction } from '@/components/set-todo-label-action'
import { useOnboarding } from './hooks/use-onboarding'
import { Action, ActionPanel, Color, Icon, List, open } from '@raycast/api'
import { createAccessoriesArray } from '@/utils/create-accessories-array'
import { DEFAULT_STATUS_ICONS } from '@/utils/statuses'

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
    handleOnAuthorize,
  } = useOnboarding()

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or create task"
    >
      <List.Section title="Onboarding">
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
            icon={{
              source: todo.completed
                ? DEFAULT_STATUS_ICONS.completed
                : DEFAULT_STATUS_ICONS.pending,
              tintColor: todo.completed
                ? {
                    light: '#0CA16C',
                    dark: '#49BC99',
                  }
                : {
                    light: '#93959C',
                    dark: '#666666',
                  },
            }}
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
                    <Action
                      title="Open Content URL"
                      icon={Icon.Link}
                      shortcut={{ modifiers: ['cmd'], key: 'e' }}
                      onAction={async () => {
                        handleComplete(todo)
                        await open(todo.contentUrl as string)
                      }}
                    />
                  ) : null}
                  <CopyToDoAction todo={todo} />
                </ActionPanel.Section>
                <AuthorizationAction onAuthorize={handleOnAuthorize} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}
