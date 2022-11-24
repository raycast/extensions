import { Tag } from '@/types/tag'
import { Todo } from '@/types/todo'
import { Color, showToast, Toast } from '@raycast/api'
import { useCallback, useMemo, useState } from 'react'

const ONBOARDING_DATA: Todo[] = [
  {
    id: '1',
    title: '👋 Hey there! - Press ↵ to complete your first task',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    inProgress: false,
  },
  {
    id: '2',
    title: '🎯 Press ⌘ + D to add a due date',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    inProgress: false,
  },
  {
    id: '3',
    title: '🏷️ Press ⌘ + L to add a label of your choice',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    inProgress: false,
  },
  {
    id: '4',
    title: '🗑️ Press ⌘ + ⌫ to delete this task',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    inProgress: false,
  },
  {
    id: '5',
    title: `📺 Press ⌘ + E to learn the rest of the tricks`,
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: 'https://www.loom.com/share/1f4c369a32794c779458bbfbcdf27494',
    inProgress: false,
  },
  {
    id: '6',
    title: `👉 If you don’t have a database yet, you can use this template (⌘ + E)`,
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl:
      'https://reboot-studio.notion.site/85dd2134f0cc4cc5b1f5ac7aab3ecbae?v=ee2ec2d05a8449b4a58a6f954ce5e250',
    inProgress: false,
  },
  {
    id: '7',
    title:
      '🥳 You are ready! - Press ⌘ + ⇧ + A and Log into your Notion account',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    inProgress: false,
  },
]

const TAGS: Tag[] = [
  { id: '1', name: 'Watch', color: Color.Blue },
  { id: '2', name: 'Later', color: Color.Magenta },
]

export const useOnboarding = () => {
  const [data, setData] = useState<Todo[]>(ONBOARDING_DATA)
  const [searchText, setSearchText] = useState<string>('')

  const handleComplete = useCallback(
    async (todo: Todo) => {
      const optimisticData = data.filter((t) => t.id !== todo.id)
      setData(optimisticData)
      showToast(Toast.Style.Success, 'Marked as Completed')
    },
    [data]
  )

  const handleCreate = useCallback(async () => {
    const optimisticTodo = {
      id: `fake-id-${Math.random() * 100}`,
      title: searchText,
      tag: null,
      url: '',
      shareUrl: '',
      contentUrl: '',
      inProgress: false,
    }

    setData([optimisticTodo, ...data])
    setSearchText('')
    showToast(Toast.Style.Success, 'Task Created')
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
    async (todo: Todo, dateValue: string | null, name: string) => {
      const optimisticData = data.map((t) =>
        t.id === todo.id
          ? {
              ...todo,
              dateValue: dateValue,
              date: new Date(dateValue || ''),
            }
          : t
      )

      setData(optimisticData)
      showToast(Toast.Style.Success, `Scheduled for ${name}`)
    },
    [data]
  )

  const handleDelete = useCallback(
    async (todoId: string) => {
      const optimisticData = data.filter((t) => t.id !== todoId)
      setData(optimisticData)
      showToast(Toast.Style.Success, 'Task Deleted')
    },
    [data]
  )

  const todos = useMemo(() => {
    if (searchText) {
      return data.filter((item) =>
        item.title.toUpperCase().includes(searchText.toUpperCase())
      )
    }

    return data
  }, [data, searchText])

  return {
    todos,
    data,
    tags: TAGS,
    searchText,
    setSearchText,
    handleCreate,
    handleComplete,
    handleSetTag,
    handleSetDate,
    handleDelete,
  }
}
