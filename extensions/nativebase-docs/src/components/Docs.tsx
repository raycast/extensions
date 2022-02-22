import { Action, ActionPanel, getPreferenceValues, List } from '@raycast/api'
import fetch from 'node-fetch'
import React, { useEffect } from 'react'
import { Sidebar, SidebarResponse } from '../types'

interface IDocsProps {
  version: string
}

export const Docs = (props: IDocsProps) => {
  const [sidebar, setSidebar] = React.useState<Array<Sidebar>>([])
  const headers: RequestInit['headers'] = {}

  const token = getPreferenceValues()?.gh_pat

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  useEffect(() => {
    fetchSidebar()
  }, [])

  const fetchSidebar = async () => {
    const res = await fetch(
      `https://raw.githubusercontent.com/GeekyAnts/nativebase-docs/main/docs/${props.version}/sidebar.json`,
      {
        method: 'GET',
        headers
      }
    )
    const data = (await res.json()) as SidebarResponse
    setSidebar(data?.sidebar)
  }

  return (
    <List
      navigationTitle={`NB Docs for version ${props.version}`}
      isLoading={!sidebar.length}
    >
      {sidebar?.map((item, index) => {
        return (
          <List.Section title={item?.title} key={index}>
            {item?.pages
              ?.filter((p) => !p.notVisibleInSidebar)
              .map((page, idx) => {
                const url = `https://docs.nativebase.io/${props.version}/${page.id}`

                return (
                  <List.Item
                    title={page?.title}
                    key={idx}
                    icon="../assets/nativebase-logo.png"
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser url={url} />
                        <Action.CopyToClipboard content={url} />
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
