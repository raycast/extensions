import { Action, ActionPanel, Color, Icon, List } from '@raycast/api'
import { useTodoList } from '@/features/todo-list/hooks/use-todo-list'
import { EmptyList } from '@/features/todo-list/components/empty-list'
import { CompleteTodoAction } from '@/components/complete-todo-action'
import { SetLabelAction } from '@/components/set-todo-label-action'
import { RemindAction } from '@/components/remind-todo-action'
import { CopyToDoAction } from '@/components/copy-todo-action'
import { DeleteTodoAction } from '@/components/delete-todo-action'
import { getProgressIcon } from '@raycast/utils'
import { InProgressAction } from '@/features/todo-list/components/in-progress-action'
import { SetProjectAction } from './components/set-todo-project-action'
import { SetUserAction } from './components/set-todo-user-action'
import { SetFilter } from './components/set-filter-action'
import { useMemo } from 'react'
import { createAccessoriesArray } from '@/utils/create-accessories-array'
import { GeneralActions } from './components/general-actions'
import { CopyTaskLinkAction } from './components/copy-task-link'
import { OpenInNotionAction } from './components/open-in-notion-action'
import { OpenOnNotionAction } from './components/open-on-notion'
import { NotStartedAction } from './components/not-started-action'
import { OpenAttachedLink } from './components/open-attached-link'

export function TodoList() {
  const {
    todos,
    tags,
    notionDbUrl,
    hasStatusProperty,
    hasAssigneeProperty,
    hasProjectProperty,
    hasTagProperty,
    loading,
    handleCreate,
    handleComplete,
    handleInProgress,
    handleNotStarted,
    handleSetTag,
    handleSetDate,
    handleDelete,
    projects,
    projectsById,
    handleSetProject,
    users,
    handleSetUser,
    newTodo,
    searchText,
    onSearchTextChange,
    filterTodo,
    handleSetFilter,
    resetFilter,
    mutatePreferences,
    isNotionInstalled,
  } = useTodoList()

  const filterCount = useMemo(() => {
    let amount = 0
    if (filterTodo.tag) amount++
    if (filterTodo.projectId) amount++
    if (filterTodo.user) amount++
    const text = amount > 1 ? `${amount} Filters` : `${amount} Filter`
    return { amount, text }
  }, [filterTodo])

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Search or create task"
    >
      {newTodo && newTodo.previewTitle ? (
        <List.Item
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          title={newTodo.previewTitle}
          accessories={createAccessoriesArray({
            todo: newTodo,
            projectsById,
          })}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Plus}
                title="Create Task"
                onAction={handleCreate}
              />
              <Action
                icon={Icon.Plus}
                title="Create Task and Copy URL"
                onAction={() => handleCreate('SHARE')}
              />
              <Action
                icon={Icon.Plus}
                title="Create Task and Open in Notion"
                onAction={() => handleCreate('OPEN')}
                shortcut={{ modifiers: ['cmd'], key: 'o' }}
              />
              <GeneralActions
                mutatePreferences={mutatePreferences}
                notionDbUrl={notionDbUrl}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {!newTodo?.title && filterCount.amount > 0 ? (
        <List.Item
          title={''}
          subtitle={filterCount.text}
          accessories={createAccessoriesArray({
            todo: filterTodo,
            projectsById,
          })}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.XMarkCircle}
                title="Clear Filters"
                onAction={resetFilter}
              />
              <SetFilter
                users={users}
                projects={projects}
                tags={tags}
                onSetFilter={handleSetFilter}
              />
              <GeneralActions
                mutatePreferences={mutatePreferences}
                notionDbUrl={notionDbUrl}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {todos?.map((todo) => (
        <List.Item
          key={todo.id}
          icon={{
            source: getProgressIcon(todo.inProgress ? 0.5 : 0),
            tintColor: todo.inProgress ? Color.Yellow : Color.SecondaryText,
          }}
          title={todo.title}
          accessories={createAccessoriesArray({
            todo,
            projectsById,
            filter: filterTodo,
          })}
          actions={
            <ActionPanel>
              <CompleteTodoAction todo={todo} onComplete={handleComplete} />
              {hasStatusProperty && todo.inProgress === false ? (
                <InProgressAction todo={todo} inProgress={handleInProgress} />
              ) : null}
              {hasStatusProperty && todo.inProgress === true ? (
                <NotStartedAction todo={todo} notStarted={handleNotStarted} />
              ) : null}
              {hasTagProperty || hasAssigneeProperty || hasProjectProperty ? (
                <SetFilter
                  users={users}
                  projects={projects}
                  tags={tags}
                  onSetFilter={handleSetFilter}
                />
              ) : null}
              {todo.contentUrl ? (
                <OpenAttachedLink url={todo.contentUrl} />
              ) : null}
              <ActionPanel.Section>
                <RemindAction todo={todo} onSetDate={handleSetDate} />
                {hasTagProperty && (
                  <SetLabelAction
                    todo={todo}
                    tags={tags}
                    onSetLabel={handleSetTag}
                    allowCreate
                  />
                )}
                {hasProjectProperty && (
                  <SetProjectAction
                    todo={todo}
                    projects={projects}
                    onSetProject={handleSetProject}
                  />
                )}
                {hasAssigneeProperty && (
                  <SetUserAction
                    todo={todo}
                    users={users}
                    onSetUser={handleSetUser}
                  />
                )}
                <CopyToDoAction todo={todo} />
                <CopyTaskLinkAction todo={todo} />
                {isNotionInstalled ? (
                  <OpenInNotionAction url={todo.url} />
                ) : (
                  <OpenOnNotionAction url={todo.shareUrl} />
                )}
                <DeleteTodoAction todo={todo} onDelete={handleDelete} />
              </ActionPanel.Section>
              <GeneralActions
                mutatePreferences={mutatePreferences}
                notionDbUrl={notionDbUrl}
              />
            </ActionPanel>
          }
        />
      ))}
      <EmptyList
        notionDbUrl={notionDbUrl}
        mutatePreferences={mutatePreferences}
      />
    </List>
  )
}
