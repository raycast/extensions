import { useMemo } from 'react'
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api'
import { useTodoList } from '@/features/todo-list/hooks/use-todo-list'
import { EmptyList } from '@/features/todo-list/components/empty-list'
import { CompleteTodoAction } from '@/components/complete-todo-action'
import { SetLabelAction } from '@/components/set-todo-label-action'
import { RemindAction } from '@/components/remind-todo-action'
import { CopyToDoAction } from '@/components/copy-todo-action'
import { DeleteTodoAction } from '@/components/delete-todo-action'
import { EditTodoTitleAction } from '@/features/todo-list/components/edit-todo-title-action'
import { SetProjectAction } from './components/set-todo-project-action'
import { SetUserAction } from './components/set-todo-user-action'
import { SetFilter } from './components/set-filter-action'
import { createAccessoriesArray } from '@/utils/create-accessories-array'
import { GeneralActions } from './components/general-actions'
import { CopyTaskLinkAction } from './components/copy-task-link'
import { OpenInNotionAction } from './components/open-in-notion-action'
import { OpenOnNotionAction } from './components/open-on-notion'
import { OpenAttachedLink } from './components/open-attached-link'
import { SetStatusAction } from './components/set-todo-status-action'
import { DEFAULT_STATUS_ICONS } from '@/utils/statuses'

export function TodoList() {
  const {
    todos,
    tags,
    statuses,
    notionDbUrl,
    hasStatusProperty,
    hasAssigneeProperty,
    hasProjectProperty,
    hasTagProperty,
    loading,
    handleCreate,
    handleComplete,
    handleSetStatus,
    handleSetTag,
    handleSetDate,
    handleDelete,
    handleUpdateTitle,
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
    if (filterTodo.status) amount++
    return amount
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
      {!newTodo?.title && filterCount > 0 ? (
        <List.Item
          title={'Filtering by'}
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
                statuses={statuses}
                hasStatusProperty={hasStatusProperty}
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
      {statuses?.map((status) => {
        const numberOfIssues =
          todos[status.id]?.length === 1
            ? '1 issue'
            : `${todos[status.id]?.length} issues`

        return (
          <List.Section
            key={status.id}
            title={status.name}
            subtitle={numberOfIssues}
          >
            {todos[status.id]?.map((todo) => {
              return (
                <List.Item
                  key={todo.id}
                  icon={{
                    source:
                      status && status.icon
                        ? status.icon
                        : DEFAULT_STATUS_ICONS.pending,
                    tintColor: status?.color
                      ? status.color
                      : Color.SecondaryText,
                  }}
                  title={todo.title}
                  accessories={createAccessoriesArray({
                    todo,
                    projectsById,
                    filter: filterTodo,
                    showStatus: false,
                  })}
                  actions={
                    <ActionPanel>
                      <CompleteTodoAction
                        todo={todo}
                        onComplete={handleComplete}
                      />
                      {hasStatusProperty && statuses?.length > 0 && (
                        <SetStatusAction
                          todo={todo}
                          statuses={statuses}
                          onSetStatus={handleSetStatus}
                        />
                      )}
                      {hasTagProperty ||
                      hasAssigneeProperty ||
                      hasProjectProperty ||
                      hasStatusProperty ? (
                        <SetFilter
                          users={users}
                          projects={projects}
                          tags={tags}
                          statuses={statuses}
                          hasStatusProperty={hasStatusProperty}
                          onSetFilter={handleSetFilter}
                        />
                      ) : null}
                      <EditTodoTitleAction
                        todo={todo}
                        onUpdateTitle={handleUpdateTitle}
                      />
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
              )
            })}
          </List.Section>
        )
      })}
      <EmptyList
        notionDbUrl={notionDbUrl}
        mutatePreferences={mutatePreferences}
      />
    </List>
  )
}
