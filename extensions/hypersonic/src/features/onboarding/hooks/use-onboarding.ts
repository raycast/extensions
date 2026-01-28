import { Tag } from '@/types/tag'
import { Todo } from '@/types/todo'
import { Color, showToast, Toast } from '@raycast/api'
import { useCachedState } from '@raycast/utils'
import { useCallback, useMemo, useState } from 'react'

type OnboardingTodo = Todo & {
  completed: boolean
}

const ONBOARDING_DATA: OnboardingTodo[] = [
  {
    id: '1',
    title: '👋 Hey there! - Press ↵ to complete your first task',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    completed: false,
  },
  {
    id: '2',
    title: '🎯 Press ⌘ + D to add a due date',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    completed: false,
  },
  {
    id: '3',
    title: '🏷️ Press ⌘ + L to add a label of your choice',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    completed: false,
  },
  {
    id: '5',
    title: `📺 Press ⌘ + E to learn the rest of the tricks ↗`,
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: 'https://www.loom.com/share/1f4c369a32794c779458bbfbcdf27494',
    completed: false,
  },
  {
    id: '7',
    title:
      '🥳 You are ready! - Press ⌘ + ⇧ + A and Log into your Notion account',
    tag: null,
    url: '',
    shareUrl: '',
    contentUrl: '',
    completed: false,
  },
]

const TAGS: Tag[] = [
  { id: '1', name: 'Watch', color: Color.Blue },
  { id: '2', name: 'Later', color: Color.Magenta },
]

export const useOnboarding = () => {
  const [data, setData] = useCachedState<OnboardingTodo[]>(
    'onboarding-data',
    ONBOARDING_DATA
  )
  const [searchText, setSearchText] = useState<string>('')

  const handleComplete = useCallback(
    (todo: Todo) => {
      const optimisticData = data.map((t) => {
        if (t.id === todo.id) {
          return { ...t, completed: true }
        }

        return t
      })
      setData(optimisticData)
      showToast(Toast.Style.Success, 'Marked as Completed')
    },
    [data]
  )

  const handleCreate = useCallback(() => {
    const optimisticTodo = {
      id: `fake-id-${Math.random() * 100}`,
      title: searchText,
      tag: null,
      url: '',
      shareUrl: '',
      contentUrl: '',
      completed: false,
    }

    setData([optimisticTodo, ...data])
    setSearchText('')
    showToast(Toast.Style.Success, 'Task Created')
  }, [searchText])

  const handleSetTag = useCallback(
    (todo, tag: Tag | null) => {
      const completed = todo.id === '3' ? true : todo.completed

      const optimisticData = data.map((t) =>
        t.id === todo.id ? { ...todo, tag, completed } : t
      ) as OnboardingTodo[]

      setData(optimisticData)
    },
    [data]
  )

  const handleSetDate = useCallback(
    async (todo, dateValue: string | null, name: string) => {
      const completed = todo.id === '2' ? true : todo.completed

      const optimisticData = data.map((t) =>
        t.id === todo.id
          ? {
              ...todo,
              dateValue: dateValue,
              date: new Date(dateValue || ''),
              completed,
            }
          : t
      ) as OnboardingTodo[]

      setData(optimisticData)
      showToast(Toast.Style.Success, `Scheduled for ${name}`)
    },
    [data]
  )

  const handleOnAuthorize = useCallback(() => {
    const optimisticData = data.map((t) => {
      if (t.id === '7') {
        return { ...t, completed: true }
      }

      return t
    })

    setData(optimisticData)
  }, [data])

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
    handleOnAuthorize,
  }
}
