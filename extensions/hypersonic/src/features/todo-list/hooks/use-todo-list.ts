import { useEffect, useMemo, useState } from 'react'
import { showToast, Toast } from '@raycast/api'
import { Todo } from '@/types/todo'
import { Tag } from '@/types/tag'
import { storeHasDoneToday, storeTodos } from '@/services/storage'
import { createTodo } from '@/services/notion/operations/create-todo'
import { completeTodo } from '@/services/notion/operations/complete-todo'
import { updateTodoTag } from '@/services/notion/operations/update-todo-tag'
import { updateTodoDate } from '@/services/notion/operations/update-todo-date'
import { getTitleUrl } from '@/services/notion/utils/get-title-url'
import { deleteTodo } from '@/services/notion/operations/delete-todo'
import { useTodos } from '@/services/notion/hooks/use-todos'
import { useDatabase } from '@/services/notion/hooks/use-database'
import { inProgressTodo } from '@/services/notion/operations/in-progress-todo'

export function useTodoList() {
  const { database, isLoading: isLoadingDb, error: dbError } = useDatabase()
  const { todos, isLoading, mutate } = useTodos(
    database.databaseId,
    isLoadingDb
  )

  const [searchText, setSearchText] = useState<string>('')
  const [filter, setFilter] = useState('all')

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

      storeHasDoneToday()
      showToast(Toast.Style.Success, 'Completed')
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleInProgress = async (todo: Todo) => {
    try {
      if (todo.id.includes('fake-id-')) return null

      await mutate(inProgressTodo(todo.id), {
        optimisticUpdate(data) {
          if (!data) return data
          return data.map((t) =>
            t.id === todo.id ? { ...todo, inProgress: true } : t
          )
        },
        shouldRevalidateAfter: false,
      })

      showToast(Toast.Style.Success, 'In Progress')
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleCreate = async () => {
    try {
      const tag = database.tags.find((t) => t.id === filter)
      const optimisticTodo = {
        id: `fake-id-${Math.random() * 1000}`,
        title: searchText,
        isCompleted: false,
        tag: tag || null,
        url: '',
        contentUrl: getTitleUrl(searchText),
        inProgress: false,
      }

      setSearchText('')

      await mutate(
        createTodo(
          {
            title: searchText,
            tagId: tag?.id || null,
          },
          database.databaseId
        ),
        {
          optimisticUpdate(data) {
            if (!data) return data
            return [optimisticTodo, ...data]
          },
          shouldRevalidateAfter: true,
        }
      )
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
          return data.map((t) => (t.id === todo.id ? { ...todo, tag } : t))
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
          return data.filter((t) => t.id !== todo.id)
        },
        shouldRevalidateAfter: true,
      })

      await showToast(Toast.Style.Success, `Reminder set for ${name}`)
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleDelete = async (todoId: string) => {
    try {
      await mutate(deleteTodo(todoId), {
        optimisticUpdate(data) {
          if (!data) return data
          return data.filter((t) => t.id !== todoId)
        },
        shouldRevalidateAfter: false,
      })
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleMoveUp = async (fromIndex: number) => {
    try {
      await mutate(undefined, {
        optimisticUpdate(data) {
          if (!data || fromIndex === 0) return data
          const toIndex = fromIndex - 1
          const newTodos = [...data]
          const todoMoved = newTodos.splice(fromIndex, 1)[0]
          newTodos.splice(toIndex, 0, todoMoved)
          return newTodos
        },
        shouldRevalidateAfter: false,
      })
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const handleMoveDown = async (fromIndex: number) => {
    try {
      await mutate(undefined, {
        optimisticUpdate(data) {
          if (!data || fromIndex === data.length - 1) return data
          const toIndex = fromIndex + 1
          const newTodos = [...todos]
          const todoMoved = newTodos.splice(fromIndex, 1)[0]
          newTodos.splice(toIndex, 0, todoMoved)
          return newTodos
        },
        shouldRevalidateAfter: false,
      })
    } catch (e: any) {
      showToast(Toast.Style.Failure, e?.message)
    }
  }

  const filteredTodos = useMemo(() => {
    if (searchText || filter !== 'all') {
      return todos.filter((item) => {
        const isTagAllowed = filter === 'all' ? true : item.tag?.id === filter

        return (
          item.title.toUpperCase().includes(searchText.toUpperCase()) &&
          isTagAllowed
        )
      })
    }

    return todos
  }, [todos, searchText, filter])

  //Sync useFetch with local storage to handle sorting sync
  useEffect(() => {
    if (todos && todos.length > 0) {
      storeTodos(todos)
    }
  }, [todos])

  return {
    todos: filteredTodos,
    data: todos,
    tags: database.tags,
    notionDbUrl: database.normalizedUrl,
    hasStatusProperty: database.hasStatusProperty,
    searchText,
    setSearchText,
    filter,
    setFilter,
    loading: isLoading,
    dbError: dbError,
    handleCreate,
    handleComplete,
    handleInProgress,
    handleSetTag,
    handleSetDate,
    handleDelete,
    handleMoveUp,
    handleMoveDown,
  }
}
