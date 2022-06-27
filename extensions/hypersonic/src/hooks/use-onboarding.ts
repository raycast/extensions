import { templateUrl } from '@/constants/template-url'
import { Tag } from '@/types/tag'
import { Todo } from '@/types/todo'
import { Color } from '@raycast/api'
import { useCallback, useEffect, useState } from 'react'

const ONBOARDING_DATA: Todo[] = [
  {
    id: '1',
    title: '👋 Hey there! - Press ↵ to complete your first to-do',
    isCompleted: false,
    tag: null,
    url: '',
    contentUrl: '',
  },
  {
    id: '2',
    title: '😴 Press ⌘ + ↵ to remind this to-do for later ',
    isCompleted: false,
    tag: null,
    url: '',
    contentUrl: '',
  },
  {
    id: '3',
    title: '🏷️ Press ⌘ + L to add a label of your choice',
    isCompleted: false,
    tag: null,
    url: '',
    contentUrl: '',
  },
  {
    id: '4',
    title: '🔗 Press ⌘ + U and duplicate Hypersonic template to your workspace',
    isCompleted: false,
    tag: null,
    url: '',
    contentUrl: templateUrl,
  },
  {
    id: '5',
    title: '👤️ Press ⌘ + S and Log into your Notion account',
    isCompleted: false,
    tag: null,
    url: '',
    contentUrl: '',
  },
]

const TAGS: Tag[] = [
  { id: '1', name: 'Watch', color: Color.Blue },
  { id: '2', name: 'Later', color: Color.Magenta },
]

export const useOnboarding = () => {
  const [data, setData] = useState<Todo[]>(ONBOARDING_DATA)
  const [todos, setTodos] = useState<Todo[]>(ONBOARDING_DATA)
  const [tags, setTags] = useState<Tag[]>(TAGS)
  const [searchText, setSearchText] = useState<string>('')

  const handleComplete = useCallback(
    async (todo: Todo) => {
      const optimisticData = data.filter((t) => t.id !== todo.id)
      setData(optimisticData)
    },
    [data]
  )

  const handleCreate = useCallback(async () => {
    const optimisticTodo = {
      id: `fake-id-${Math.random() * 100}`,
      title: searchText,
      isCompleted: false,
      tag: null,
      url: '',
      contentUrl: '',
    }

    setData([optimisticTodo, ...data])
    setSearchText('')
  }, [searchText])

  const handleSetTag = useCallback(
    async (todo: Todo, tag: Tag | null) => {
      const optimisticData = data.map((t) =>
        t.id === todo.id ? { ...todo, tag } : t
      )
      setData(optimisticData)
    },
    [data]
  )

  const handleSetDate = useCallback(
    async (todo: Todo, dateValue: Date | null, name: string) => {
      const optimisticData = data.filter((t) => t.id !== todo.id)
      setData(optimisticData)
    },
    [data]
  )

  const handleDelete = useCallback(
    async (todoId: string) => {
      const optimisticData = data.filter((t) => t.id !== todoId)
      setData(optimisticData)
    },
    [data]
  )

  const handleMoveUp = useCallback(
    async (fromIndex: number) => {
      if (fromIndex === 0) return null
      const toIndex = fromIndex - 1
      const newTodos = [...data]
      const todoMoved = newTodos.splice(fromIndex, 1)[0]
      newTodos.splice(toIndex, 0, todoMoved)
      setData(newTodos)
    },
    [data]
  )

  const handleMoveDown = useCallback(
    async (fromIndex: number) => {
      if (fromIndex === data.length - 1) return null
      const toIndex = fromIndex + 1
      const newTodos = [...data]
      const todoMoved = newTodos.splice(fromIndex, 1)[0]
      newTodos.splice(toIndex, 0, todoMoved)
      setData(newTodos)
    },
    [data]
  )

  useEffect(() => {
    if (searchText) {
      setTodos(
        data.filter((item) =>
          item.title.toUpperCase().includes(searchText.toUpperCase())
        )
      )
    } else {
      setTodos(data)
    }
  }, [data, searchText])

  return {
    todos,
    data,
    tags,
    searchText,
    setSearchText,
    handleCreate,
    handleComplete,
    handleSetTag,
    handleSetDate,
    handleDelete,
    handleMoveUp,
    handleMoveDown,
  }
}
