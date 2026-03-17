import path from 'node:path'
import fs from 'node:fs'
import { useMemo } from 'react'
import { ActionPanel, List, Action, environment, Icon, useNavigation } from '@raycast/api'
import { runAppleScript, useCachedPromise, useCachedState } from '@raycast/utils'
import DocumentationItemDetail from './search-documentation/DocumentationItemDetail'
import { getDocumentationTypeIcon, getSourceTypeIcon } from './documentation/icons'
import { DocumentationContext, DocumentationContextValue } from './documentation/DocumentationContext'
import { DocumentationDetailItem, DocumentationItem, DocumentationRepository, SourceItem } from './documentation/types'

const jxaScriptPath = path.join(environment.assetsPath, 'fetchDocumentationRepositoryScript.jxa.txt')
const jxaScript = fs.readFileSync(jxaScriptPath).toString()
const defaultSource = { name: 'All Sources', path: '*' }

export default function main() {
  const [selectedSource, setSelectedSource] = useCachedState<SourceItem>('selected-sourced', defaultSource)

  const {
    isLoading,
    data: documentationRepository,
    revalidate: revalidateDocs
  } = useCachedPromise(
    async (): Promise<DocumentationRepository> => {
      const output = await runAppleScript(jxaScript, [], { language: 'JavaScript' })

      const docsRepository = JSON.parse(output) as DocumentationRepository
      return docsRepository
    },
    [],
    {
      initialData: {
        sourceList: [],
        sourceToDocumentationRangeEntries: [],
        documentationList: [],
        documentationItemsEntries: []
      } as DocumentationRepository,
      failureToastOptions: {
        title: "Couldn't resolve documentation files of Hammerspoon"
      }
    }
  )

  const sourceToDocumentationRangeMap = useMemo(() => {
    return new Map(documentationRepository.sourceToDocumentationRangeEntries)
  }, [documentationRepository])

  const sourceDropdownItems = useMemo(() => {
    const files: SourceItem[] = [defaultSource]
    files.push(...documentationRepository.sourceList)
    return files
  }, [documentationRepository])

  const groups = useMemo(() => {
    const result = []

    for (const [sourcePath, range] of sourceToDocumentationRangeMap.entries()) {
      const selectedSourceItem = documentationRepository.sourceList.find((source) => source.path === sourcePath)

      if (selectedSourceItem) {
        const [rangeStart, rangeEnd] = range

        result.push({
          id: `${selectedSourceItem.name}-${selectedSourceItem.path}`,
          name: selectedSourceItem.name,
          items: documentationRepository.documentationList.slice(rangeStart, rangeEnd + 1)
        })
      }
    }

    return result
  }, [documentationRepository, sourceToDocumentationRangeMap])

  const documentationContextValue = useMemo(() => {
    return {
      documentationList: documentationRepository.documentationList,
      documentationItemsMap: new Map(documentationRepository.documentationItemsEntries)
    }
  }, [documentationRepository.documentationList, documentationRepository.documentationItemsEntries])

  const dropdownSourceFilesEl = (
    <List.Dropdown
      tooltip="Select a documentation source to search"
      value={`${selectedSource.name}\n${selectedSource.path}`}
      onChange={(newValue) => {
        const [name, path] = newValue.split('\n')

        setSelectedSource({
          name,
          path
        })
      }}
    >
      {sourceDropdownItems.map((item) => (
        <List.Dropdown.Item
          key={`${item.name}-${item.path}`}
          title={item.name}
          value={`${item.name}\n${item.path}`}
          icon={getSourceTypeIcon(item.type)}
        />
      ))}
    </List.Dropdown>
  )

  let listContentEl

  if (selectedSource.path === '*') {
    const groupEls = []

    for (const group of groups) {
      groupEls.push(
        <List.Section key={group.id} title={group.name}>
          {renderListItems(group.items, documentationContextValue, revalidateDocs)}
        </List.Section>
      )
    }

    listContentEl = groupEls
  } else {
    const selectedSourceItem = documentationRepository.sourceList.find((source) => source.path === selectedSource.path)
    const targetPath = selectedSourceItem?.path ?? ''

    const range = sourceToDocumentationRangeMap.get(targetPath)

    if (range) {
      const [rangeStart, rangeEnd] = range
      listContentEl = renderListItems(
        documentationRepository.documentationList.slice(rangeStart, rangeEnd + 1),
        documentationContextValue,
        revalidateDocs
      )
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to search Hammerspoon documentation..."
      searchBarAccessory={dropdownSourceFilesEl}
    >
      {listContentEl}
    </List>
  )
}

function renderListItems(
  items: DocumentationItem[],
  documentationContextValue: DocumentationContextValue,
  revalidateDocs: () => void
) {
  const { push } = useNavigation()

  return items.map((item) => {
    const keywords = item.name.includes('.') ? item.name.split('.') : []

    return (
      <List.Item
        key={item.id}
        icon={{ value: getDocumentationTypeIcon(item.type), tooltip: item.type }}
        title={{ value: item.name, tooltip: item.type }}
        keywords={keywords}
        subtitle={{ value: item.description, tooltip: item.description }}
        actions={
          <ActionPanel>
            <Action
              title="Show Details"
              onAction={async () => {
                const output = await runAppleScript(jxaScript, ['detail', item.sourceFile, item.sourceType, item.id], {
                  language: 'JavaScript'
                })

                const documentationDetailItem = JSON.parse(output) as DocumentationDetailItem

                push(
                  <DocumentationContext value={documentationContextValue}>
                    <DocumentationItemDetail item={documentationDetailItem} />
                  </DocumentationContext>
                )
              }}
            />
            <Action
              title="Refresh"
              onAction={revalidateDocs}
              shortcut={{ modifiers: ['cmd'], key: 'r' }}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel>
        }
      />
    )
  })
}
