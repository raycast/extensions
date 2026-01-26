export type CollectionsResponseType = { collections: Array<CollectionType> }

export type CollectionType = {
  id: string
  name: string
  owner: string
  createdAt: string
  updatedAt: string
  uid: string
  isPublic: boolean
}

export type CollectionDetailType = {
  collection: {
    item: Array<RequestDetailsType>
  }
}

export type RequestType = {
  method?: MethodsType
  header?: Array<HeaderType>
  url?: URLType
  body?: BodyType
}

export type MethodsType = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"

export type HeaderType = {
  key: string
  value: string
  type: string
  disabled?: boolean
}

export type RequestDetailsType = {
  name: string
  id: string
  protocolProfileBehavior?: {
    disableBodyPruning: boolean
  }
  request: RequestType
  response: []
  item?: Array<RequestDetailsType>
}

export type URLType = {
  raw?: string
  protocol?: "https" | "http"
  host?: Array<string>
  path?: Array<string>
  query?: ParamsType
}

export type VariablesType = Array<string>
export type ParamsType = Array<{
  key: string
  type: string
  disabled: boolean
  value?: string
}>

export type FormPayloadType = Record<string, string | boolean>

export type BodyType = {
  mode?: "raw" | "urlencoded" | "formdata" | "file" | "graphql"
  raw?: string
  urlencoded?: Array<{ key: string; value: string; disabled?: boolean }>
  formdata?: Array<{
    key: string
    value: string
    type?: string
    disabled?: boolean
  }>
  options?: {
    raw?: {
      language?: string
    }
  }
}

export type HistoryEntry = {
  id: string
  timestamp: number
  name?: string
  method: MethodsType
  url: string
  request: {
    headers?: HeaderType[]
    body?: BodyType
    payload?: FormPayloadType
  }
  response: {
    statusCode?: number
    headers?: Record<string, string>
    body?: string
  }
}

export type Environment = {
  id: string
  name: string
  variables: Record<string, string>
  createdAt: number
  updatedAt: number
}
