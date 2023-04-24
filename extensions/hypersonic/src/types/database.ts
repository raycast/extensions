type Relation = {
  databaseId: string
  propertyName: string
}

type Status = {
  type: 'status' | 'checkbox'
  name: string
  doneName?: string
  completedStatuses?: string[]
  inProgressId?: string
  notStartedId?: string
}

type TypeWithValue<T> = {
  data: T
  value: string
}

type OptionalColumn = {
  name: string
  value: string
}

export type Database = {
  id: string
  name: string
  url: string
  value: string
  image: string
  columns: {
    title: string[]
    date: string[]
    status: TypeWithValue<Status>[]
    project: TypeWithValue<Relation>[]
    assignee: OptionalColumn[]
    tags: OptionalColumn[]
    url: OptionalColumn[]
  }
}
