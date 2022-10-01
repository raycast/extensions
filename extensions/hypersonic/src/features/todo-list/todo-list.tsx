import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
} from '@raycast/api'
import { useTodoList } from '@/features/todo-list/hooks/use-todo-list'
import { EmptyList } from '@/features/todo-list/components/empty-list'
import { CompleteTodoAction } from '@/components/complete-todo-action'
import { SetLabelAction } from '@/components/set-todo-label-action'
import { RemindAction } from '@/components/remind-todo-action'
import { CopyToDoAction } from '@/components/copy-todo-action'
import { WhatHaveIDoneAction } from '@/features/todo-list/components/what-have-i-done-action'
import { OpenNotionAction } from '@/features/todo-list/components/open-notion-action'
import { DeleteTodoAction } from '@/components/delete-todo-action'
import { TransparentEmpty } from '@/features/todo-list/components/transparent-empty'
import { useMemo, useState } from 'react'
import { Todo } from '@/types/todo'
import { DateReminder } from './components/date-reminder'
import { getProgressIcon } from '@raycast/utils'
import { InProgressAction } from '@/features/todo-list/components/in-progress-action'
import { ReauthorizeAction } from './components/reauthorize-action'
import { templateUrl } from '@/constants/template-url'

export function TodoList() {
  const {
    todos,
    data,
    tags,
    notionDbUrl,
    hasStatusProperty,
    searchText,
    setSearchText,
    loading,
    dbError,
    handleCreate,
    handleComplete,
    handleInProgress,
    handleSetTag,
    handleSetDate,
    handleDelete,
    handleMoveUp,
    handleMoveDown,
    setFilter,
    filter,
  } = useTodoList()

  const [todoToEdit, setTodoToEdit] = useState<Todo | null>(null)
  const databaseName = useMemo(() => getPreferenceValues().database_name, [])

  if (dbError) {
    return (
      <List>
        <List.EmptyView
          title={`We couldn't find ${databaseName} database.`}
          description="Make sure to duplicate the template (↵) and grant permission (⌘ + ↵)"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Link"
                icon={Icon.Link}
                url={templateUrl}
              />
              <ReauthorizeAction />
            </ActionPanel>
          }
        />
      </List>
    )
  }

  if (todoToEdit) {
    return (
      <DateReminder
        taskToEdit={todoToEdit}
        setTaskToEdit={setTodoToEdit}
        handleSetDate={handleSetDate}
      />
    )
  }

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter or create to-do"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by tag"
          value={filter}
          onChange={setFilter}
        >
          <List.Dropdown.Item title="All" value={'all'} />
          {tags?.map((tag) => (
            <List.Dropdown.Item
              key={tag.id}
              icon={{
                source: 'dot.png',
                tintColor: tag.color,
              }}
              title={tag.name}
              value={tag.id}
            />
          ))}
        </List.Dropdown>
      }
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
        ? todos?.map((todo, index) => (
            <List.Item
              key={todo.id}
              icon={{
                source: {
                  light: getProgressIcon(todo.inProgress ? 0.5 : 0, '#E0A905'),
                  dark: getProgressIcon(todo.inProgress ? 0.5 : 0, '#edc03c'),
                },
              }}
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
                  <RemindAction
                    todo={todo}
                    onSetDate={handleSetDate}
                    selectTask={setTodoToEdit}
                  />
                  <SetLabelAction
                    todo={todo}
                    tags={tags}
                    onSetLabel={handleSetTag}
                  />
                  {hasStatusProperty && (
                    <InProgressAction
                      todo={todo}
                      inProgress={handleInProgress}
                    />
                  )}
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
                  <ReauthorizeAction />
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
        <EmptyList notionDbUrl={notionDbUrl} />
      ) : (
        <TransparentEmpty />
      )}
    </List>
  )
}
