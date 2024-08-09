import './internal/fetch-polyfill'

import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { useState } from 'react'

type Eip = {
  id: number
  title: string
  authors: string | null
  category: string | null
  status: string | null
  github: string | null
  created: string | null
  description: string | null
  discussionsTo: string | null
  requires: string | null
  type: string | null
  url: string | null
}

const statusColors = {
  Idea: '#EEEEEE',
  Draft: '#EEEEEE',
  Active: '#30A46C',
  Review: '#FFE629',
  'Last Call': '#0090FF',
  Withdrawn: '#E54D2E',
  Stagnant: '#FFE629',
  Living: '#30A46C',
  Final: '#30A46C',
} as const

const statusIcons = {
  Idea: Icon.LightBulb,
  Review: Icon.MagnifyingGlass,
  'Last Call': Icon.Clock,
  Withdrawn: Icon.Warning,
  Stagnant: Icon.Warning,
} as const

function getEipType(eip: Eip) {
  if (eip.github?.includes('ERCS')) return 'ERC'
  if (eip.github?.includes('RIPS')) return 'RIP'
  return 'EIP'
}

export default function Command() {
  const limit = 30

  const [searchText, setSearchText] = useState('')
  const [showDetail, setShowDetail] = useState(false)

  const { data, isLoading, pagination } = useFetch<readonly Eip[]>(
    ((options: any) =>
      'https://api.wevm.dev/eips?' +
      new URLSearchParams({
        ...(options.cursor ? { cursor: (Number(options.cursor) - 1).toString() } : {}),
        dir: 'desc',
        searchText,
        limit: limit.toString(),
      }).toString()) as any,
    {
      mapResult: (result) => {
        return {
          hasMore: result.length >= limit,
          data: result,
          cursor: result.length > 0 ? result.slice(-1)[0].id : 0,
        }
      },
      keepPreviousData: true,
    },
  )

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      pagination={pagination}
      searchText={searchText}
      throttle
    >
      {data?.map((eip) =>
        eip ? (
          <List.Item
            key={eip.id}
            title={`${getEipType(eip)}-${eip.id}`}
            subtitle={eip.title}
            accessories={[
              {
                tag: {
                  color: (statusColors as any)[eip.status!],
                  value: eip.status!,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={eip.url!} />
                <Action
                  shortcut={{ modifiers: ['cmd'], key: 'enter' }}
                  onAction={() => setShowDetail((x) => !x)}
                  icon={Icon.ArrowRightCircle}
                  title={showDetail ? 'Hide Detail' : 'Show Detail'}
                />
                <Action.OpenInBrowser
                  title="Open in GitHub"
                  shortcut={{ modifiers: ['cmd'], key: 'g' }}
                  url={eip.github!}
                />
                {eip.discussionsTo && (
                  <Action.OpenInBrowser
                    title="Open Discussion"
                    icon={Icon.SpeechBubble}
                    shortcut={{ modifiers: ['cmd'], key: 'd' }}
                    url={eip.discussionsTo!}
                  />
                )}
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={eip.status!}
                        icon={(statusIcons as any)[eip.status!]}
                        color={(statusColors as any)[eip.status!]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title={`EIP-${eip.id.toString()}`}
                      text={eip.title}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {(eip.category || eip.type) && (
                      <List.Item.Detail.Metadata.TagList title="Category">
                        {eip.type && <List.Item.Detail.Metadata.TagList.Item text={eip.type} />}
                        {eip.category && (
                          <List.Item.Detail.Metadata.TagList.Item text={eip.category} />
                        )}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {eip.created && (
                      <List.Item.Detail.Metadata.Label title="Created" text={eip.created} />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    {eip.authors
                      ?.split(',')
                      .map((author, index) => (
                        <List.Item.Detail.Metadata.Label
                          key={author}
                          title={
                            index === 0
                              ? `Author${eip.authors!.split(',').length > 0 ? 's' : ''}`
                              : ''
                          }
                          text={author}
                        />
                      ))}
                    {eip.requires && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.TagList title="Requires">
                          {eip.requires.split(',').map((eip) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={eip}
                              onAction={() => setSearchText(eip)}
                              text={eip}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ) : null,
      )}
    </List>
  )
}
