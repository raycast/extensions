import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openCommandPreferences,
} from '@raycast/api'
import { useTodos } from '@/hooks/use-todos'
import { EmptyList } from '@/components/empty-list'
import { CompleteTodoAction } from '@/components/complete-todo-action'
import { SetLabelAction } from '@/components/set-todo-label-action'
import { RemindAction } from '@/components/remind-todo-action'
import { CopyToDoAction } from '@/components/copy-todo-action'
import { WhatHaveIDoneAction } from '@/components/what-have-i-done-action'
import { OpenNotionAction } from '@/components/open-notion-action'
import { DeleteTodoAction } from '@/components/delete-todo-action'
import { TransparentEmpty } from '@/components/transparent-empty'

export function ToDoList() {
  const {
    todos,
    data,
    tags,
    notionDbUrl,
    searchText,
    setSearchText,
    loading,
    handleCreate,
    handleComplete,
    handleSetTag,
    handleSetDate,
    handleDelete,
    handleMoveUp,
    handleMoveDown,
    getInitialData,
  } = useTodos()

  return (
    <List
      isLoading={loading}
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
              <Action.OpenInBrowser
                title="Open Database"
                icon={Icon.Binoculars}
                url={notionDbUrl}
                shortcut={{ modifiers: ['cmd'], key: 'i' }}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {todos.length > 0
        ? todos.map((todo, index) => (
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
                        shortcut={{ modifiers: ['cmd'], key: 'u' }}
                      />
                    ) : null}
                    <CopyToDoAction todo={todo} />
                    <Action.OpenInBrowser
                      title="Open in Notion"
                      icon={Icon.Window}
                      url={todo.url}
                      shortcut={{ modifiers: ['cmd'], key: 'o' }}
                    />
                    <OpenNotionAction notionDbUrl={notionDbUrl} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <WhatHaveIDoneAction />
                  </ActionPanel.Section>
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openCommandPreferences}
                    shortcut={{ modifiers: ['cmd'], key: ',' }}
                  />
                </ActionPanel>
              }
            />
          ))
        : null}
      {data && data.length === 0 ? (
        <EmptyList notionDbUrl={notionDbUrl} getInitialData={getInitialData} />
      ) : (
        <TransparentEmpty />
      )}
    </List>
  )
}
