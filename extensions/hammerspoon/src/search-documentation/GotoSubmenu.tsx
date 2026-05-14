import path from 'node:path'
import fs from 'node:fs'
import { useContext, useState } from 'react'
import { DocumentationItem, DocumentationDetailItem } from '../documentation/types'
import { getDocumentationTypeIcon } from '../documentation/icons'
import { Action, ActionPanel, environment, Icon, useNavigation } from '@raycast/api'
import DocumentationItemDetail from './DocumentationItemDetail'
import { DocumentationContext } from '../documentation/DocumentationContext'
import { runAppleScript } from '@raycast/utils'

type GotoSubmenuProps = {
  item: DocumentationDetailItem
}

const jxaScriptPath = path.join(environment.assetsPath, 'fetchDocumentationRepositoryScript.jxa.txt')
const jxaScript = fs.readFileSync(jxaScriptPath).toString()

export function GotoSubmenu({ item }: GotoSubmenuProps) {
  const documentationContextValue = useContext(DocumentationContext)
  const { documentationList, documentationItemsMap } = documentationContextValue
  const { push } = useNavigation()
  const [itemsInScope, setItemsInScope] = useState<DocumentationItem[]>([])

  return (
    <ActionPanel.Submenu
      title="Go to"
      icon={Icon.Box}
      shortcut={{ modifiers: ['cmd'], key: 'p' }}
      onOpen={() => {
        const similarItems = []
        let targetForChildrenItem: DocumentationItem | undefined

        if (item.parentId != null) {
          const parentItemIdx = documentationItemsMap.get(item.parentId) ?? -1
          const parentItem = documentationList[parentItemIdx]

          if (parentItem) {
            targetForChildrenItem = parentItem
            similarItems.push(parentItem)
          }
        } else {
          targetForChildrenItem = item
        }

        if (targetForChildrenItem?.childrenIds) {
          for (const childId of targetForChildrenItem.childrenIds) {
            const childItemIdx = documentationItemsMap.get(childId) ?? -1
            const childItem = documentationList[childItemIdx]

            if (childItem && childItem.id !== item.id) {
              similarItems.push(childItem)
            }
          }
        }

        setItemsInScope(similarItems)
      }}
    >
      {itemsInScope.map((itemInScope) => (
        <Action
          key={itemInScope.id}
          title={itemInScope.name}
          icon={getDocumentationTypeIcon(itemInScope.type)}
          onAction={async () => {
            const output = await runAppleScript(
              jxaScript,
              ['detail', itemInScope.sourceFile, itemInScope.sourceType, itemInScope.id],
              {
                language: 'JavaScript'
              }
            )

            const documentationDetailItem = JSON.parse(output) as DocumentationDetailItem

            push(
              <DocumentationContext value={documentationContextValue}>
                <DocumentationItemDetail item={documentationDetailItem} />
              </DocumentationContext>
            )
          }}
        />
      ))}
    </ActionPanel.Submenu>
  )
}
