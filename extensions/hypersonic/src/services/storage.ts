import { LocalStorage } from '@raycast/api'
import { Todo } from '@/types/todo'

export const loadDatabase = async (): Promise<{
  databaseUrl: string
  databaseId: string
}> => {
  const database: string | undefined = await LocalStorage.getItem(
    'NOTION_DATABASE'
  )
  return JSON.parse(database || '{}')
}

export const storeDatabase = (database: {
  databaseUrl: string
  databaseId: string
}) => {
  return LocalStorage.setItem('NOTION_DATABASE', JSON.stringify(database))
}

export const storeDoneProperty = (data: {
  doneName: string
  inProgressId: string
  type: string
}) => {
  return LocalStorage.setItem('DONE_PROPERTY', JSON.stringify(data))
}

export const loadDoneProperty = async (): Promise<{
  doneName: string
  inProgressId: string
  type: string
}> => {
  const data: string | undefined = await LocalStorage.getItem('DONE_PROPERTY')

  return JSON.parse(data || '{}')
}

export const loadTodos = async () => {
  const localTodos: string | undefined = await LocalStorage.getItem(
    'NOTION_TODOS'
  )
  return JSON.parse(localTodos || '[]') as Todo[]
}

export const storeTodos = (todos: any[]) => {
  return LocalStorage.setItem('NOTION_TODOS', JSON.stringify(todos))
}

export const storeTodayCoin = (coin: string) => {
  const today = new Date().toISOString().split('T')[0]
  return LocalStorage.setItem(`coin-${today}`, coin)
}

export const loadTodayCoin = () => {
  const today = new Date().toISOString().split('T')[0]
  return LocalStorage.getItem(`coin-${today}`)
}

export const storeHasDoneToday = () => {
  const today = new Date().toISOString().split('T')[0]
  return LocalStorage.setItem(`done-${today}`, true)
}

export const loadHasDoneToday = () => {
  const today = new Date().toISOString().split('T')[0]
  return LocalStorage.getItem(`done-${today}`)
}
