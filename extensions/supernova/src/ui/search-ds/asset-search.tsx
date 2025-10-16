//
//  asset-search.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Grid, Icon } from "@raycast/api"
import { useState, useEffect } from "react"
import { SupernovaSDK } from "../../managers/supernova-sdk"
import { fullAssetGroupPath } from "../../utilities/url"
import { assetIcon } from "../../utilities/icons"
import { AssetActions } from "./asset-actions"
import { AssetSectionProps, AssetItemProps, AssetSearchState, SizeDropdownProps } from "../../definitions/props"
import { LightweightCachedAssetGroup } from "../../managers/supernova-cache-compute"
import { showErrorToast } from "../../utilities/toasts"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const AssetSearch = (): JSX.Element => {
  // ----- Data & State
  const sdk = SupernovaSDK.getInstance()
  const [state, setState] = useState<AssetSearchState>({
    data: [],
    filteredData: [],
    searchQuery: "",
    isLoading: true,
    viewSize: Grid.ItemSize.Medium
  })

  const setDataObserver = async () => {
    /* eslint-disable */
    await sdk.getCachedOrNewAssets(
      (data: Array<LightweightCachedAssetGroup>, fromCache: boolean) => {
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
      filteredData: sdk.searchIndex.searchAssets(searchText, oldState.data)
    }))
  }

  useEffect(() => {
    setDataObserver()
  }, [])

  // ----- Render
  return (
    <Grid
      isLoading={state.isLoading}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Search assets..."
      itemSize={state.viewSize}
      throttle={false}
      searchBarAccessory={
        <SizeDropdown
          onChange={(size) => {
            setState((oldState) => ({
              ...oldState,
              viewSize: size
            }))
          }}
        />
      }
    >
      <AssetSection assetGroups={state.searchQuery.length > 0 ? state.filteredData : state.data} sdk={sdk} />
    </Grid>
  )
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Partial Components

const AssetSection = (props: AssetSectionProps): JSX.Element | null => {
  if (props.assetGroups.length === 0) {
    return null
  }

  return (
    <>
      {props.assetGroups.map((g) => (
        <Grid.Section key={g.id} title={fullAssetGroupPath(g, " / ")} subtitle={`${g.assets.length} asset${g.assets.length > 1 ? "s" : ""}`}>
          {g.assets.map((t) => {
            return <AssetListItem key={t.id} asset={t} assetGroup={g} sdk={props.sdk} />
          })}
        </Grid.Section>
      ))}
    </>
  )
}

const AssetListItem = (props: AssetItemProps): JSX.Element => {
  // ----- Render

  return (
    <Grid.Item title={props.asset.name} content={assetIcon(props.asset) ?? Icon.QuestionMark} actions={<AssetActions asset={props.asset} sdk={props.sdk} />} />
  )
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Search helpers

const SizeDropdown = (props: SizeDropdownProps): JSX.Element => {
  return (
    <Grid.Dropdown
      tooltip="Select asset item preview size on grid"
      storeValue={true}
      onChange={(newValue) => {
        props.onChange(newValue as Grid.ItemSize)
      }}
    >
      {Object.values(Grid.ItemSize).map((assetType) => (
        <Grid.Dropdown.Item key={assetType} title={assetType} value={assetType} />
      ))}
    </Grid.Dropdown>
  )
}
