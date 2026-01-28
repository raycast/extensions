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
}

// TODO: change to req methods
export type MethodsType = string

export type HeaderType = {
  key: string
  value: string
  type: string
}

export type RequestDetailsType = {
  name: string
  id: string
  protocolProfileBehavior?: {
    disableBodyPruning: boolean
  }
  request: RequestType
  response: []
}

export type URLType = {
  raw?: string
  protocol?: "https"
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
