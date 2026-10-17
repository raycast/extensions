type SourceType = 'hs' | 'Lua' | 'Spoon'

export interface SourceItem {
  type?: SourceType
  name: string
  path: string
}

export interface DocumentationItem {
  id: string
  sourceType: SourceType
  sourceFile: string
  name: string
  type: string
  description: string
  parentId?: string
  childrenIds?: string[]
}

export type DocumentationDetailItem = DocumentationItem & {
  documentation: string
}

export interface DocumentationRepository {
  sourceList: SourceItem[]
  sourceToDocumentationRangeEntries: Array<[string, [number, number]]>
  documentationList: DocumentationItem[]
  documentationItemsEntries: Array<[string, number]>
}
