import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { useState } from 'react'
import HammerspoonDoc from './models/doc'

function Page({ doc }: { doc: HammerspoonDoc }) {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(true)
  doc.fetch().then(() => {
    setIsLoading(false)
  })

  return (
    <List
      searchBarPlaceholder={`Search ${doc.module}...`}
      isLoading={isLoading}
      isShowingDetail
      onSelectionChange={(path) => {
        if (path) {
          setIsLoadingDetail(true)
          new HammerspoonDoc(path).fetch().finally(() => {
            setIsLoadingDetail(false)
          })
        }
      }}
    >
      {Object.entries(doc.sections ?? {}).map(([title, children]) => {
        return (
          <List.Section key={title} title={title}>
            {Object.values(children).map((child) => {
              return (
                <List.Item
                  id={child.path}
                  key={child.path}
                  title={child.name}
                  detail={
                    <List.Item.Detail
                      isLoading={isLoadingDetail}
                      markdown={child?.overview ?? ' '}
                      metadata={
                        child.isModule && (
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Module" text={child?.module} />
                            <List.Item.Detail.Metadata.Separator />
                            {Object.entries(child?.sections ?? {}).map(([title, grandchildren]) => {
                              return (
                                <List.Item.Detail.Metadata.Label
                                  key={title}
                                  title={title}
                                  text={Object.values(grandchildren)
                                    .map((grandchild) => grandchild.name)
                                    .join(', ')}
                                />
                              )
                            })}
                          </List.Item.Detail.Metadata>
                        )
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      {child.isModule && (
                        <Action.Push icon={Icon.ChevronRight} title="Open" target={<Page doc={child} />} />
                      )}
                      <Action.CopyToClipboard
                        title="Copy Path"
                        content={child.code}
                        shortcut={{ modifiers: ['cmd'], key: 'c' }}
                      />
                      <Action
                        icon={{ source: 'icon-prod.png' }}
                        title="Open in Hammerspoon"
                        onAction={() => child.documentation()}
                        shortcut={{ modifiers: ['cmd'], key: 'o' }}
                      />
                      <Action.Paste
                        title="Paste Path"
                        content={child.code}
                        shortcut={{ modifiers: ['opt', 'cmd'], key: 'v' }}
                      />
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        url={child.url}
                        shortcut={{ modifiers: ['opt', 'cmd'], key: 'o' }}
                      />
                    </ActionPanel>
                  }
                />
              )
            })}
          </List.Section>
        )
      })}
    </List>
  )
}

export default function Command() {
  return <Page doc={new HammerspoonDoc('.hs')} />
}
