import { useCallback, useEffect, useState } from 'react'
import { showToast, Toast } from '@raycast/api'

import {
  loadTags,
  loadTodos,
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
  const [loading, setLoading] = useState<boolean>(true)

  const getInitialData = async () => {
    try {
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

  const handleComplete = useCallback(
    async (todo: Todo) => {
      try {
        if (todo.id.includes('fake-id-') || !data) return null
        storeHasDoneToday()
        setLoading(true)
        const optimisticData = data.filter((t) => t.id !== todo.id)
        setData(optimisticData)
        await updateTodoStatus(todo.id, true)
        await storeTodos(optimisticData)
        showToast(Toast.Style.Success, 'Marked as Done')
      } catch (e) {
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
      const optimisticTodo = {
        id: `fake-id-${Math.random() * 100}`,
        title: searchText,
        isCompleted: false,
        tag: null,
        url: '',
        contentUrl: getTitleUrl(searchText),
      }

      setData([optimisticTodo, ...data])
      setSearchText('')

      const validatedTodo = await createTodo({
        title: searchText,
      })

      const validatedData = [validatedTodo, ...data]
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
    async (todo: Todo, dateValue: Date | null, name: string) => {
      try {
        if (!data) return null
        setLoading(true)
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
      if (searchText) {
        setTodos(
          data.filter((item) =>
            item.title.toUpperCase().includes(searchText.toUpperCase())
          )
        )
      } else {
        setTodos(data)
      }
    }
  }, [data, searchText])

  return {
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
  }
}
