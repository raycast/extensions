import { Status } from './status'
import { Tag } from './tag'
import { User } from './user'

export type Filter = {
  projectId: string | null
  user: User | null
  tag: Tag | null
  status: Status | null
}
