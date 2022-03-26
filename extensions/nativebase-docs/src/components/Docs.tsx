import { Action, ActionPanel, List, LocalStorage } from '@raycast/api'
import fetch from 'node-fetch'
import React, { useEffect } from 'react'
import { timeCheck } from '../services/timecheck'
import { PagePage, Sidebar, SidebarResponse } from '../types'

interface IDocsProps {
  version: string
}

export const Docs = (props: IDocsProps) => {
  const [sidebar, setSidebar] = React.useState<Array<Sidebar>>([])

  useEffect(() => {
    fetchSidebar()
  }, [])

  const fetchSidebar = async () => {
    const cachedSidebar = await LocalStorage.getItem(
      `nb-docs:sidebar-${props.version}`
    )
    if ((await timeCheck()) && cachedSidebar) {
      setSidebar(await JSON.parse(cachedSidebar as string))
      return
    }
    const res = await fetch(
      `https://raw.githubusercontent.com/GeekyAnts/nativebase-docs/main/docs/${props.version}/sidebar.json`
    )
    const data = (await res.json()) as SidebarResponse
    setSidebar(data?.sidebar)
    LocalStorage.setItem(
      `nb-docs:sidebar-${props.version}`,
      JSON.stringify(data?.sidebar)
    )
  }

  return (
    <List
      navigationTitle={`NativeBase ${props.version} Documentation`}
      isLoading={!sidebar.length}
    >
      {sidebar?.map((item, index) => {
        return (
          <List.Section title={item?.title} key={index}>
            {item?.pages
              ?.filter((p) => !p.notVisibleInSidebar)
              .map((page, idx) => {
                const url = `https://docs.nativebase.io/${props?.version}/${page?.id}`

                return (
                  <List.Item
                    title={page?.title}
                    key={idx}
                    icon="../assets/nativebase-logo.png"
                    keywords={[item?.title, page?.title]}
                    actions={
                      <ActionPanel>
                        {page?.isCollapsed && page.pages?.length && (
                          <Action.Push
                            title={`Open ${page?.title}`}
                            icon="../assets/nativebase-logo.png"
                            shortcut={{
                              modifiers: ['cmd', 'shift'],
                              key: 'enter'
                            }}
                            target={
                              <SubList
                                navTitle={item?.title}
                                title={page?.title}
                                pages={page.pages}
                                version={props.version}
                              />
                            }
                          />
                        )}
                        {!page?.isCollapsed && (
                          <Action.OpenInBrowser url={url} />
                        )}
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

interface ISubList {
  pages: Array<PagePage>
  title: string
  navTitle: string
  version: string
}

const SubList = (props: ISubList) => {
  return (
    <List navigationTitle={props?.navTitle}>
      <List.Section title={props?.title}>
        {props?.pages.map((page) => {
          const url = `https://docs.nativebase.io/${props.version}/${page?.id}`

          return (
            <List.Item
              title={page?.title}
              key={page?.id}
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
    </List>
  )
}
