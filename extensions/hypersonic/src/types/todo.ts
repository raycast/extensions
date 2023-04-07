import { Status } from './status'
import { Tag } from './tag'
import { User } from './user'

export interface Todo {
  id: string
  title: string
  previewTitle?: string
  tag: Tag | null
  url: string
  shareUrl: string
  contentUrl: string | null
  inProgress?: string
  projectId?: string | null
  user?: User | null
  date?: Date | null
  dateValue?: string | null
  status?: Status | Partial<Status> | null
}
