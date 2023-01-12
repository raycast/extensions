//
//  doc-search.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Icon, List } from "@raycast/api"
import { useState, useEffect } from "react"
import { DocSearchResult, DocSearchResultDataType } from "@supernovaio/supernova-sdk"
import { SupernovaSDK } from "../../managers/supernova-sdk"
import DocPageDetailActions from "./doc-page-detail-actions"
import { DocumentationSectionProps, DocumentationPageItemProps, SearchSectionProps, SearchListItemProps, DocSearchState } from "../../definitions/props"
import { LightweightCachedDocumentationGroup, LightweightCachedDocumentationPage } from "../../managers/supernova-cache-compute"
import { showErrorToast } from "../../utilities/toasts"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const DocSearch = (): JSX.Element => {
  // ----- Data & State
  const sdk = SupernovaSDK.getInstance()
  const [state, setState] = useState<DocSearchState>({
    data: [],
    pages: [],
    results: [],
    searchQuery: "",
    isLoading: true
  })

  const setDataObserver = async () => {
    /* eslint-disable */
    await sdk.getCachedOrNewDocumentationItems(
      (data: Array<LightweightCachedDocumentationGroup>, fromCache: boolean) => {
        // Data obtained
        let pages: Array<LightweightCachedDocumentationPage> = []
        for (const group of data) {
          pages = pages.concat(group.pages)
        }
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
          data: data,
          pages: pages
        }))
      },
      (error: Error) => {
        // Error encountered
        setState((oldState) => ({
          ...oldState,
          isLoading: false
        }))
        showErrorToast(error.message)
      }
    )
  }

  // ----- Search
  const handleSearchChange = (searchText: string) => {
    // Data obtained, filter and search
    setState((oldState) => ({
      ...oldState,
      searchQuery: searchText,
      results: sdk.searchIndex.search(searchText)
    }))
  }

  useEffect(() => {
    setDataObserver()
  }, [])

  // ----- Render
  return (
    <List isLoading={state.isLoading} onSearchTextChange={handleSearchChange} searchBarPlaceholder="Search design system documentation..." throttle>
      {state.searchQuery.length > 0 ? <SearchResults results={state.results} pages={state.pages} /> : <PageResults groups={state.data} />}
    </List>
  )
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Partial Components

// ----- Interface mode with results shown

const SearchResults = (props: { results: Array<DocSearchResult>; pages: Array<LightweightCachedDocumentationPage> }) => {
  return (
    <>
      <SearchSection results={props.results} type={DocSearchResultDataType.pageTitle} pages={props.pages} />
      <SearchSection results={props.results} type={DocSearchResultDataType.sectionHeader} pages={props.pages} />
      <SearchSection results={props.results} type={DocSearchResultDataType.contentBlock} pages={props.pages} />
    </>
  )
}

// ----- Interface mode with default results

const PageResults = (props: { groups: Array<LightweightCachedDocumentationGroup> }) => {
  return (
    <>
      {props.groups.map((g) => (
        <DocumentationSection key={g.id} group={g} />
      ))}
    </>
  )
}

const DocumentationSection = (props: DocumentationSectionProps): JSX.Element => {
  return (
    <List.Section title={props.group.title + ` (${props.group.pages.length})`} subtitle={props.group.path}>
      {props.group.pages.map((page) => (
        <DocumentationPageItem key={page.id} page={page} />
      ))}
    </List.Section>
  )
}

const DocumentationPageItem = (props: DocumentationPageItemProps) => {
  // ----- Render
  return (
    <List.Item
      title={props.page.title}
      subtitle={props.page.description}
      icon={Icon.Document}
      key={props.page.id}
      actions={<DocPageDetailActions page={props.page} canPushDetail={true} />}
    />
  )
}

const SearchSection = (props: SearchSectionProps): JSX.Element | null => {
  let title = ""
  switch (props.type) {
    case DocSearchResultDataType.contentBlock:
      title = "Content"
      break
    case DocSearchResultDataType.pageTitle:
      title = "Pages"
      break
    case DocSearchResultDataType.sectionHeader:
      title = "Sections"
      break
  }

  const sectionItems = props.results.filter((r) => r.item.type === props.type)
  if (sectionItems.length === 0) {
    return null
  }

  return (
    <List.Section title={title} subtitle={`${sectionItems.length} result${sectionItems.length > 1 ? "s" : ""}`}>
      {sectionItems.map((s) => {
        const page = props.pages.filter((p) => p.id === s.item.pageId)[0]
        return <SearchListItem key={s.refIndex} searchResult={s} page={page} />
      })}
    </List.Section>
  )
}

const SearchListItem = (props: SearchListItemProps) => {
  let icon
  switch (props.searchResult.item.type) {
    case DocSearchResultDataType.contentBlock:
      icon = Icon.Text
      break
    case DocSearchResultDataType.pageTitle:
      icon = Icon.Document
      break
    case DocSearchResultDataType.sectionHeader:
      icon = Icon.List
      break
  }

  // ----- Render
  return (
    <List.Item
      title={props.searchResult.item.text}
      subtitle={props.searchResult.item.pageName}
      icon={icon}
      actions={<DocPageDetailActions page={props.page} canPushDetail={true} />}
    />
  )
}
