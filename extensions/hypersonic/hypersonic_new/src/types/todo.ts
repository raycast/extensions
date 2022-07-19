import { Tag } from './tag'

export interface Todo {
  id: string
  title: string
  isCompleted: boolean
  isCancelled: boolean
  tag: Tag | null
  url: string
  contentUrl: string | null
  isOverdue: boolean
  dueDate: string | null
}
