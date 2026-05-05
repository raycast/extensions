import { useMemo, useState } from 'react'
import {
  Alert,
  confirmAlert,
  Icon,
  showToast,
  Toast,
  open as openBrowser,
  Clipboard,
  showHUD,
} from '@raycast/api'
import { Todo } from '@/types/todo'
import { Tag } from '@/types/tag'
import { createTodo } from '@/services/notion/operations/create-todo'
import { completeTodo } from '@/services/notion/operations/complete-todo'
import { updateTodoTag } from '@/services/notion/operations/update-todo-tag'
import { updateTodoDate } from '@/services/notion/operations/update-todo-date'
import { updateTodoTitle } from '@/services/notion/operations/update-todo-title'
import { deleteTodo } from '@/services/notion/operations/delete-todo'
import { useTodos } from '@/services/notion/hooks/use-todos'
import { useProjects } from '@/services/notion/hooks/use-projects'
import { updateTodoProject } from '@/services/notion/operations/update-todo-project'
import { useUsers } from '@/services/notion/hooks/use-users'
import { updateTodoUser } from '@/services/notion/operations/update-todo-user'
import * as chrono from 'chrono-node'
import { useTags } from '@/services/notion/hooks/use-tags'
import { useLocalPreferences } from '@/services/notion/hooks/use-local-preferences'
import { useFilter } from '@/services/notion/hooks/use-filter'
import { autocomplete } from '../utils/autocomplete'
import { toISOStringWithTimezone } from '../utils/to-iso-string-with-time-zone'
import { refreshMenuBar } from '../utils/refresh-menu-bar'
import { optimisticSorting } from '../utils/optimistic-sorting'
import { useIsNotionInstalled } from '@/services/notion/hooks/use-is-notion-installed'
import { useStatuses } from '@/services/notion/hooks/use-get-statuses'
import { setStatusTodo } from '@/services/notion/operations/set-status-todo'
import { Status } from '@/types/status'

export function useTodoList() {
  const [newTodo, setNewTodo] = useState<Todo | null>(null)
  const [searchText, setSearchText] = useState<string>('')
  const { filterTodo, setFilterTodo } = useFilter()

  const { preferences, revalidatePreferences } = useLocalPreferences()
  const { statuses } = useStatuses(preferences.databaseName)
  const { todos, isLoading, mutate } = useTodos({
    databaseId: preferences.databaseId,
    filter: filterTodo,
  })

  const { projects, projectsById } = useProjects(
    preferences.properties?.relatedDatabase?.databaseId
  )
  const { tags } = useTags(preferences.databaseName)
  const { users } = useUsers()

  const isNotionInstalled = useIsNotionInstalled()

  const handleComplete = async (todo: Todo) => {
    try {
      if (todo.id.includes('fake-id-')) return null

      await mutate(completeTodo(todo.id), {
        optimisticUpdate(data) {
          if (!data) return data
          return data.filter((t) => t.id !== todo.id)
        },
        shouldRevalidateAfter: false,
      })

      showToast(Toast.Style.Success, 'Marked as Completed')
      refreshMenuBar()
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleSetStatus = async (todo: Todo, status: Status) => {
    try {
      if (todo.id.includes('fake-id-')) return null

      await mutate(setStatusTodo(todo.id, status.id), {
        optimisticUpdate(data) {
          if (!data) return data

          if (filterTodo.status && filterTodo.status.id !== status.id) {
            return data.filter((t) => t.id !== todo.id)
          } else if (
            preferences?.properties?.status?.completedStatuses &&
            preferences.properties.status.completedStatuses.includes(
              status.name
            )
          ) {
            return data.filter((t) => t.id !== todo.id)
          }

          const todos = data.map((t) =>
            t.id === todo.id ? { ...todo, status } : t
          )

          return todos
        },
        shouldRevalidateAfter: true,
      })

      showToast(Toast.Style.Success, `Marked as ${status.name}`)
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleCreate = async (action?: 'SHARE' | 'OPEN') => {
    try {
      if (!newTodo) return null

      const optimisticTodo = {
        ...newTodo,
        id: `fake-id-${Math.random() * 1000}`,
      }

      setNewTodo(null)
      setSearchText('')

      const createdTodo = await mutate(
        createTodo(optimisticTodo, preferences.databaseId),
        {
          optimisticUpdate(data) {
            if (!data) return data

            if (
              filterTodo.user &&
              filterTodo.user.id !== optimisticTodo?.user?.id
            ) {
              return data
            }

            if (
              filterTodo.projectId &&
              filterTodo.projectId !== optimisticTodo?.projectId
            ) {
              return data
            }

            if (
              filterTodo.tag &&
              filterTodo.tag.id !== optimisticTodo?.tag?.id
            ) {
              return data
            }

            const todos = [optimisticTodo, ...data]
            return todos
          },
          shouldRevalidateAfter: true,
        }
      )

      showToast(Toast.Style.Success, 'Task Created')
      refreshMenuBar()

      if (action === 'SHARE') {
        await Clipboard.copy(`Added to Hypersonic: ${createdTodo.shareUrl}`)
        await showHUD('Copied to Clipboard')
      }

      if (action === 'OPEN') {
        if (isNotionInstalled) {
          await openBrowser(createdTodo.url)
        } else {
          await openBrowser(createdTodo.shareUrl)
        }
      }
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleSetTag = async (todo: Todo, tag: Tag | null) => {
    try {
      const tagId = tag?.id ? tag.id : null
      await mutate(updateTodoTag(todo.id, tagId), {
        optimisticUpdate(data) {
          if (!data) return data

          if (filterTodo.tag && filterTodo.tag.id !== tagId) {
            return data.filter((t) => t.id !== todo.id)
          }

          return data.map((t) => (t.id === todo.id ? { ...todo, tag } : t))
        },
        shouldRevalidateAfter: true,
      })
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleSetProject = async (todo: Todo, project: any | null) => {
    try {
      const projectId = project?.id ? project.id : null
      await mutate(updateTodoProject(todo.id, projectId), {
        optimisticUpdate(data) {
          if (!data) return data

          if (filterTodo.projectId && filterTodo.projectId !== projectId) {
            return data.filter((t) => t.id !== todo.id)
          }

          return data.map((t) => (t.id === todo.id ? { ...todo, project } : t))
        },
        shouldRevalidateAfter: true,
      })
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleSetUser = async (todo: Todo, user: any | null) => {
    try {
      const userId = user?.id ? user.id : null
      await mutate(updateTodoUser(todo.id, userId), {
        optimisticUpdate(data) {
          if (!data) return data

          if (filterTodo.user && filterTodo.user.id !== userId) {
            return data.filter((t) => t.id !== todo.id)
          }

          return data.map((t) => (t.id === todo.id ? { ...todo, user } : t))
        },
        shouldRevalidateAfter: true,
      })
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleSetDate = async (
    todo: Todo,
    dateValue: string | null,
    name: string
  ) => {
    try {
      await showToast(Toast.Style.Animated, 'Scheduling...')

      await mutate(updateTodoDate(todo.id, dateValue), {
        optimisticUpdate(data) {
          if (!data) return data
          const todos = data.map((t) =>
            t.id === todo.id
              ? {
                  ...todo,
                  dateValue: dateValue || null,
                  date: dateValue ? new Date(dateValue) : null,
                }
              : t
          )
          return todos
        },
        shouldRevalidateAfter: true,
      })

      await showToast(Toast.Style.Success, `Scheduled for ${name}`)
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleDelete = async (todoId: string) => {
    if (
      await confirmAlert({
        title: 'Are you sure you want to delete?',
        icon: Icon.Trash,
        primaryAction: {
          title: 'Delete',
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await mutate(deleteTodo(todoId), {
          optimisticUpdate(data) {
            if (!data) return data
            return data.filter((t) => t.id !== todoId)
          },
          shouldRevalidateAfter: false,
        })

        showToast(Toast.Style.Success, 'Task Deleted')
        refreshMenuBar()
      } catch (e: any) {
        showToast(Toast.Style.Failure, e?.message)
      }
    }
  }

  const handleUpdateTitle = async (todo: Todo, newTitle: string) => {
    if (!newTitle.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Title cannot be empty',
      })
      return
    }
    if (newTitle === todo.title) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Title is unchanged',
      })
      return
    }
    try {
      await showToast(Toast.Style.Animated, 'Updating title...')
      await mutate(updateTodoTitle(todo.id, newTitle), {
        optimisticUpdate(data) {
          if (!data) return data
          const todos = data.map((t) =>
            t.id === todo.id
              ? {
                  ...t,
                  title: newTitle,
                }
              : t
          )
          return todos
        },
        shouldRevalidateAfter: true,
      })

      await showToast(Toast.Style.Success, 'Title updated')
    } catch (e: any) {
      await showToast(Toast.Style.Failure, e?.message)
    }
  }

  const onSearchTextChange = (text: string) => {
    let projectId = null
    let tag = null
    let user = null
    let date = null
    let dateValue = null
    let contentUrl = null
    let status =
      statuses && statuses.length > 0 ? statuses[statuses.length - 1] : null

    const projectMatch = text.match(/ #(\w+)/)
    const userMatch = text.match(/ @(\w+)/)
    const tagMatch = text.match(/ l:(\w+)/)
    const dateMatch = chrono.parse(text)
    const urlMatch = preferences?.properties?.url
      ? text.match(/(?:https?):\/\/[\n\S]+/g)
      : null
    const statusMatch = text.match(/ \/(\w+)/)

    if (projectMatch) {
      const pFound = autocomplete(projectMatch[1], projects, {
        keys: ['title'],
      })

      if (pFound.length > 0) {
        projectId = pFound[0].item.id
      } else {
        projectId = null
      }
    } else if (filterTodo.projectId) {
      projectId = filterTodo.projectId
    }

    if (userMatch) {
      const uFound = autocomplete(userMatch[1], users, {
        keys: ['name'],
      })

      if (uFound.length > 0) {
        user = uFound[0].item
      } else {
        user = null
      }
    } else if (filterTodo.user) {
      user = filterTodo.user
    }

    if (tagMatch) {
      const tFound = autocomplete(tagMatch[1], tags, {
        keys: ['name'],
      })

      if (tFound.length > 0) {
        tag = tFound[0].item
      } else {
        tag = null
      }
    } else if (filterTodo.tag) {
      tag = filterTodo.tag
    }

    if (dateMatch && dateMatch.length > 0) {
      date = dateMatch[0].start.date()
      dateValue = toISOStringWithTimezone(dateMatch[0].start.date())
    }

    if (urlMatch) {
      contentUrl = urlMatch[0]
    }

    if (statusMatch) {
      const sFound = autocomplete(statusMatch[1], statuses, {
        keys: ['name'],
      })
      if (sFound.length > 0) {
        status = sFound[0].item
      } else {
        status = null
      }
    } else if (filterTodo.status) {
      status = filterTodo.status
    }

    // Clean all values matching from text and previous white space as title constant
    const title = text
      .replace(projectMatch ? projectMatch[0] : '', '')
      .replace(userMatch ? userMatch[0] : '', '')
      .replace(tagMatch ? tagMatch[0] : '', '')
      .replace(urlMatch ? urlMatch[0] : '', '')
      .replace(statusMatch ? statusMatch[0] : '', '')
      .replace(dateMatch && dateMatch.length > 0 ? dateMatch[0].text : '', '')
      .replace(/\s+/g, ' ')
      .trim()

    const previewTitle =
      contentUrl && preferences?.properties?.url ? `${title} ↗︎` : title

    setSearchText(text)
    setNewTodo({
      id: 'new',
      title: title,
      previewTitle,
      url: '',
      shareUrl: '',
      tag,
      projectId,
      user,
      date,
      contentUrl,
      status: status,
      dateValue,
    })
  }

  const handleSetFilter = (
    filter: any,
    type: 'status' | 'projectId' | 'tag' | 'user'
  ) => {
    const newFilterTodo = { ...filterTodo }

    newFilterTodo[type] = filter

    if (filterTodo?.projectId === filter) {
      newFilterTodo['projectId'] = null
    }

    if (filterTodo?.tag?.id === filter?.id) {
      newFilterTodo['tag'] = null
    }

    if (filterTodo?.user?.id === filter?.id) {
      newFilterTodo['user'] = null
    }

    if (filterTodo?.status?.id === filter?.id) {
      newFilterTodo['status'] = null
    }

    setFilterTodo(newFilterTodo)
    refreshMenuBar()
  }

  const resetFilter = () => {
    setFilterTodo({
      tag: null,
      projectId: null,
      user: null,
      status: null,
    })
    refreshMenuBar()
  }

  const filteredTodos = useMemo(() => {
    if (searchText) {
      const key = searchText.toUpperCase()
      const filteredTodos = todos.filter((item) =>
        item.title.toUpperCase().includes(key)
      )
      return optimisticSorting(filteredTodos)
    }

    return optimisticSorting(todos)
  }, [todos, searchText])

  return {
    todos: filteredTodos,
    tags: tags,
    statuses,
    notionDbUrl: isNotionInstalled
      ? preferences.normalizedUrl
      : preferences.databaseUrl,
    hasStatusProperty: preferences?.properties?.status?.type === 'status',
    hasAssigneeProperty: !!preferences?.properties?.assignee,
    hasProjectProperty: !!preferences?.properties?.project,
    hasTagProperty: !!preferences?.properties?.tag,
    loading: isLoading,
    handleCreate,
    handleComplete,
    handleSetStatus,
    handleUpdateTitle,
    handleSetTag,
    handleSetDate,
    handleDelete,
    projects,
    projectsById,
    handleSetProject,
    users,
    handleSetUser,
    onSearchTextChange,
    newTodo,
    handleSetFilter,
    filterTodo,
    resetFilter,
    searchText,
    mutatePreferences: revalidatePreferences,
    isNotionInstalled,
  }
}
