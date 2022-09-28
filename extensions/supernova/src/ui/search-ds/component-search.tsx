//
//  doc-search.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { List } from "@raycast/api"
import { useState, useEffect } from "react"
import { SupernovaSDK } from "../../managers/supernova-sdk"
import { ComponentDetailView } from "./component-detail-view"
import { componentIcon } from "../../utilities/icons"
import { ComponentDetailActions } from "./component-detail-actions"
import { ComponentSectionProps, ComponentListItemProps, ComponentSearchState } from "../../definitions/props"
import { LightweightCachedComponent } from "../../managers/supernova-cache-compute"
import { showErrorToast } from "../../utilities/toasts"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export default function ComponentSearch() {
  // ----- Data & State
  const sdk = SupernovaSDK.getInstance()
  const [state, setState] = useState<ComponentSearchState>({
    data: [],
    filteredData: [],
    searchQuery: "",
    isLoading: true
  })

  const setDataObserver = async () => {
    /* eslint-disable */
    await sdk.getCachedOrNewComponents(
      (data: Array<LightweightCachedComponent>, fromCache: boolean) => {
        // Data obtained
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
          data: data
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
      filteredData: sdk.searchIndex.searchComponents(searchText, oldState.data)
    }))
  }

  useEffect(() => {
    setDataObserver()
  }, [])

  // ----- Render
  return (
    <List isLoading={state.isLoading} onSearchTextChange={handleSearchChange} searchBarPlaceholder="Search components..." isShowingDetail={true}>
      <ComponentSection components={state.searchQuery.length > 0 ? state.filteredData : state.data} />
    </List>
  )
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Partial Components

function ComponentSection(props: ComponentSectionProps): JSX.Element | null {
  if (props.components.length === 0) {
    return null
  }

  return (
    <>
      {props.components.map((c) => {
        return <ComponentListItem key={c.id} component={c} />
      })}
    </>
  )
}

function ComponentListItem(props: ComponentListItemProps) {
  // ----- Render
  return (
    <List.Item
      title={props.component.name}
      detail={<ComponentDetailView component={props.component} />}
      actions={<ComponentDetailActions component={props.component} />}
      icon={componentIcon(props.component)}
    />
  )
}
