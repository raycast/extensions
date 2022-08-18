import { useCallback, useEffect, useState } from 'react'
import { showToast, Toast } from '@raycast/api'

import {
  loadTags,
  loadTodos,
  loadDatabase,
  storeHasDoneToday,
  storeTodos,
} from '@/services/storage'
import { getTodos } from '../services/notion/operations/get-todos'
import { createTodo } from '../services/notion/operations/create-todo'
import { updateTodoStatus } from '../services/notion/operations/update-todo-status'

import { Todo } from '@/types/todo'
import { Tag } from '@/types/tag'
import { getDatabase } from '../services/notion/operations/get-database'
import { updateTodoTag } from '../services/notion/operations/update-todo-tag'
import { updateTodoDate } from '../services/notion/operations/update-todo-date'
import { formatNotionUrl } from '../services/notion/utils/format-notion-url'
import { getTitleUrl } from '../services/notion/utils/get-title-url'
import { deleteTodo } from '../services/notion/operations/delete-todo'

export function useTodos() {
  const [data, setData] = useState<Todo[] | null>(null)
  const [notionDbUrl, setNotionDbUrl] = useState<string>('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [searchText, setSearchText] = useState<string>('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState<boolean>(true)

  const getInitialData = async () => {
    try {
      const localDatabase = await loadDatabase()
      setNotionDbUrl(formatNotionUrl(localDatabase.databaseUrl))
      const localTodos = await loadTodos()
      setData(localTodos)
      const localTags = await loadTags()
      setTags(localTags)

      const { tags, databaseId, databaseUrl } = await getDatabase()
      const fetchedTodos = await getTodos(databaseId, localTodos)

      setTags(tags)
      setNotionDbUrl(formatNotionUrl(databaseUrl))
      setData(fetchedTodos)
    } catch (e) {
      showToast(Toast.Style.Failure, 'Error occurred')
    } finally {
      setLoading(false)
    }
  }

  function wait(ms: any, opts: { signal?: any }) {
    return new Promise((resolve, reject) => {
      const timerId = setTimeout(resolve, ms)
      if (opts.signal) {
        // implement aborting logic for our async operation
        opts.signal.addEventListener('abort', (event: any) => {
          clearTimeout(timerId)
          reject(event)
        })
      }
    })
  }

  const handleComplete = useCallback(
    async (todo: Todo) => {
      const controller = new AbortController()
      const options: Toast.Options = {
        title: 'Completing...',
        message: 'Press ⌘ + U to undo',
        style: Toast.Style.Animated,
        primaryAction: {
          shortcut: { modifiers: ['cmd'], key: 'u' },
          title: 'Undo',
          onAction: () => {
            controller.abort()
          },
        },
      }
      const oldData = [...(data || [])]
      try {
        if (todo.id.includes('fake-id-') || !data) return null
        storeHasDoneToday()
        setLoading(true)
        const optimisticData = data.filter((t) => t.id !== todo.id)
        setData(optimisticData)
        showToast(options)
        await wait(2000, { signal: controller.signal })
        await updateTodoStatus(todo.id, true)
        await storeTodos(optimisticData)
        showToast(Toast.Style.Success, 'Completed')
      } catch (e: any) {
        if (e?.type === 'abort') {
          showToast(Toast.Style.Success, 'Completing Undone')
          return setData(oldData)
        }
        showToast(Toast.Style.Failure, 'Error occurred')
      } finally {
        setLoading(false)
      }
    },
    [data]
  )

  const handleCreate = useCallback(async () => {
    try {
      if (!data) return null
      setLoading(true)
      const tag = tags.find((t) => t.id === filter)
      const optimisticTodo = {
        id: `fake-id-${Math.random() * 100}`,
        title: searchText,
        isCompleted: false,
        tag: tag || null,
        url: '',
        contentUrl: getTitleUrl(searchText),
      }

      setData([...data, optimisticTodo])
      setSearchText('')

      const validatedTodo = await createTodo({
        title: searchText,
        tagId: tag?.id || null,
      })

      const validatedData = [...data, validatedTodo]
      setData(validatedData)
      await storeTodos(validatedData)
    } catch (e) {
      showToast(Toast.Style.Failure, 'Error occurred')
    } finally {
      setLoading(false)
    }
  }, [searchText])

  const handleSetTag = useCallback(
    async (todo: Todo, tag: Tag | null) => {
      try {
        if (!data) return null
        setLoading(true)
        const optimisticData = data.map((t) =>
          t.id === todo.id ? { ...todo, tag } : t
        )
        setData(optimisticData)
        const tagId = tag?.id ? tag.id : null
        const validatedTodo = await updateTodoTag(todo.id, tagId)
        const validatedData = data.map((t) =>
          t.id === validatedTodo.id ? validatedTodo : t
        )
        setData(validatedData)
        await storeTodos(validatedData)
      } catch (e) {
        showToast(Toast.Style.Failure, 'Error occurred')
      } finally {
        setLoading(false)
      }
    },
    [data]
  )

  const handleSetDate = useCallback(
    async (todo: Todo, dateValue: string | null, name: string) => {
      try {
        if (!data) return null
        setLoading(true)
        showToast(Toast.Style.Animated, 'Scheduling...')
        const optimisticData = data.filter((t) => t.id !== todo.id)
        setData(optimisticData)
        await updateTodoDate(todo.id, dateValue)
        await storeTodos(optimisticData)
        showToast(Toast.Style.Success, `Reminder set for ${name}`)
      } catch (e) {
        showToast(Toast.Style.Failure, 'Error occurred')
      } finally {
        setLoading(false)
      }
    },
    [data]
  )

  const handleDelete = useCallback(
    async (todoId: string) => {
      try {
        if (!data) return null
        setLoading(true)
        const optimisticData = data.filter((t) => t.id !== todoId)
        setData(optimisticData)
        await deleteTodo(todoId)
        await storeTodos(optimisticData)
      } catch (e) {
        showToast(Toast.Style.Failure, 'Error occurred')
      } finally {
        setLoading(false)
      }
    },
    [data]
  )

  const handleMoveUp = useCallback(
    async (fromIndex: number) => {
      try {
        if (fromIndex === 0 || !data) return null
        const toIndex = fromIndex - 1
        const newTodos = [...data]
        const todoMoved = newTodos.splice(fromIndex, 1)[0]
        newTodos.splice(toIndex, 0, todoMoved)
        setData(newTodos)
        await storeTodos(newTodos)
      } catch (e) {
        showToast(Toast.Style.Failure, 'Error occurred')
      } finally {
        setLoading(false)
      }
    },
    [data]
  )

  const handleMoveDown = useCallback(
    async (fromIndex: number) => {
      try {
        if (!data || fromIndex === data.length - 1) return null
        const toIndex = fromIndex + 1
        const newTodos = [...data]
        const todoMoved = newTodos.splice(fromIndex, 1)[0]
        newTodos.splice(toIndex, 0, todoMoved)
        setData(newTodos)
        await storeTodos(newTodos)
      } catch (e) {
        showToast(Toast.Style.Failure, 'Error occurred')
      } finally {
        setLoading(false)
      }
    },
    [data]
  )

  useEffect(() => {
    getInitialData()
  }, [])

  useEffect(() => {
    if (data) {
      if (searchText || filter !== 'all') {
        setTodos(
          data.filter((item) => {
            const isTagAllowed =
              filter === 'all' ? true : item.tag?.id === filter

            return (
              item.title.toUpperCase().includes(searchText.toUpperCase()) &&
              isTagAllowed
            )
          })
        )
      } else {
        setTodos(data)
      }
    }
  }, [data, searchText, filter])

  return {
    todos,
    data,
    tags,
    notionDbUrl,
    searchText,
    setSearchText,
    filter,
    setFilter,
    loading,
    handleCreate,
    handleComplete,
    handleSetTag,
    handleSetDate,
    handleDelete,
    handleMoveUp,
    handleMoveDown,
    getInitialData,
  }
}
