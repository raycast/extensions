import { createContext } from 'react'
import { DocumentationItem } from './types'

export type DocumentationContextValue = {
  documentationList: DocumentationItem[]
  documentationItemsMap: Map<string, number>
}

export const DocumentationContext = createContext<DocumentationContextValue>({
  documentationList: [],
  documentationItemsMap: new Map<string, number>()
})
