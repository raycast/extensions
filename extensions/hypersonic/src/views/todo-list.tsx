import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
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
import { Todo } from '@/types/todo'
import { CancelTodoAction } from '@/components/cancel-todo-action'
import { formatDateForList } from '@/services/notion/utils/format-date-for-list'

export function ToDoList({ selectTask }: { selectTask: (todo: Todo) => void }) {
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
    handleCancel,
    handleSetTag,
    handleSetDate,
    handleDelete,
    handleMoveUp,
    handleMoveDown,
    setFilter,
    filter,
    getInitialData,
  } = useTodos()

  const preferences = getPreferenceValues()

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
          {tags.map((tag) => (
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
        ? todos.map((todo, index) => (
            <List.Item
              key={todo.id}
              // icon={
              //   todo.isCompleted
              //     ? { source: Icon.Checkmark, tintColor: Color.Green }
              //     : todo.isOverdue
              //     ? todo.tag
              //       ? { source: Icon.Clock, tintColor: todo.tag.color }
              //       : Icon.Clock
              //     : todo.tag
              //     ? { source: Icon.Circle, tintColor: todo.tag.color }
              //     : Icon.Circle
              // }
              icon={
                todo.isCompleted
                  ? { source: Icon.Checkmark, tintColor: Color.Green }
                  : todo.isOverdue
                  ? { source: Icon.Circle }
                  : //, tintColor: Color.Red }
                    { source: Icon.Circle }
                //, tintColor: Color.Blue }
              }
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
                      {
                        text: todo.dueDate
                          ? todo.isOverdue
                            ? formatDateForList(todo.dueDate)
                            : null
                          : null,
                        icon: todo.dueDate
                          ? todo.isOverdue
                            ? {
                                source: Icon.Calendar,
                                tintColor: Color.Red,
                              }
                            : Icon.Clock
                          : {
                              source: Icon.Calendar,
                              tintColor: Color.Yellow,
                            },
                      },
                    ]
                  : [
                      {
                        text: todo.dueDate
                          ? todo.isOverdue
                            ? formatDateForList(todo.dueDate)
                            : null
                          : null,
                        icon: todo.dueDate
                          ? todo.isOverdue
                            ? {
                                source: Icon.Calendar,
                                tintColor: Color.Red,
                              }
                            : Icon.Clock
                          : {
                              source: Icon.Calendar,
                              tintColor: Color.Yellow,
                            },
                      },
                    ]
              }
              actions={
                <ActionPanel>
                  <CompleteTodoAction todo={todo} onComplete={handleComplete} />
                  <RemindAction
                    todo={todo}
                    onSetDate={handleSetDate}
                    selectTask={selectTask}
                  />
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
