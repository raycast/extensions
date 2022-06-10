import { CreatePageResponse } from '@notionhq/client/build/src/api-endpoints'

type Property = {
  id: string
  type: string
  [key: string]: any
}

export type TodoPage = CreatePageResponse & {
  properties: { [tag: string]: Property }
  url: string
}
