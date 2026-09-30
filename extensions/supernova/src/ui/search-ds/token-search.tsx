//
//  token-search.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { List } from "@raycast/api"
import { useState, useEffect } from "react"
import { TokenType } from "@supernovaio/supernova-sdk"
import { SupernovaSDK } from "../../managers/supernova-sdk"
import { fullTokenGroupPath } from "../../utilities/url"
import { TokenDetailView } from "./token-detail-view"
import { tokenIcon } from "../../utilities/icons"
import { TokenDetailActions } from "./token-detail-actions"
import { TokenSectionsProps, TokenSectionProps, TokenListItemProps, TypeDropdownProps, TokenSearchState } from "../../definitions/props"
import { LightweightCachedTokenGroup } from "../../managers/supernova-cache-compute"
import { showErrorToast } from "../../utilities/toasts"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const TokenSearch = (): JSX.Element => {
  // ----- Data & State
  const sdk = SupernovaSDK.getInstance()
  const [state, setState] = useState<TokenSearchState>({
    data: [],
    filteredData: [],
    searchQuery: "",
    isLoading: true,
    categoryFilter: undefined
  })

  const setDataObserver = async () => {
    /* eslint-disable */
    await sdk.getCachedOrNewTokens(
      (data: Array<LightweightCachedTokenGroup>, fromCache: boolean) => {
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
      filteredData: sdk.searchIndex.searchTokens(searchText, oldState.data)
    }))
  }

  useEffect(() => {
    setDataObserver()
  }, [])

  // ----- Render
  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Search tokens..."
      isShowingDetail={true}
      searchBarAccessory={
        <TypeDropdown
          onChange={(type) => {
            setState((oldState) => ({
              ...oldState,
              categoryFilter: type
            }))
          }}
        />
      }
    >
      <TokenSections tokenGroups={state.searchQuery.length > 0 ? state.filteredData : state.data} categoryFilter={state.categoryFilter} />
    </List>
  )
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Partial Components

const TokenSections = (props: TokenSectionsProps): JSX.Element => {
  if (props.categoryFilter) {
    return <TokenSection tokenGroups={props.tokenGroups} type={props.categoryFilter} />
  } else {
    return (
      <>
        {Object.values(TokenType).map((t) => {
          return <TokenSection tokenGroups={props.tokenGroups} type={t} key={t} />
        })}
      </>
    )
  }
}

const TokenSection = (props: TokenSectionProps): JSX.Element | null => {
  const filteredTokenGroups = props.tokenGroups.filter((g) => g.tokenType === props.type)
  if (filteredTokenGroups.length === 0) {
    return null
  }

  return (
    <>
      {filteredTokenGroups.map((g) => {
        return (
          <List.Section key={g.id} title={fullTokenGroupPath(g, " / ")} subtitle={`${g.tokens.length} token${g.tokens.length > 1 ? "s" : ""}`}>
            {g.tokens.map((t) => {
              return <TokenListItem key={t.id} token={t} tokenGroup={g} keywords={fullTokenGroupPath(g, " / ")} />
            })}
          </List.Section>
        )
      })}
    </>
  )
}

const TokenListItem = (props: TokenListItemProps): JSX.Element => {
  // ----- Render
  return (
    <List.Item
      title={props.token.name}
      icon={tokenIcon(props.token)}
      detail={<TokenDetailView token={props.token} tokenGroup={props.tokenGroup} />}
      actions={<TokenDetailActions token={props.token} tokenGroup={props.tokenGroup} />}
      keywords={props.keywords.split(" / ")}
    />
  )
}

const TypeDropdown = (props: TypeDropdownProps): JSX.Element => {
  return (
    <List.Dropdown
      tooltip="Select token filter"
      storeValue={true}
      onChange={(newValue) => {
        props.onChange(newValue === "All" ? undefined : (newValue as TokenType))
      }}
    >
      <List.Dropdown.Item key={"All"} title={"All tokens"} value={"All"} />
      {Object.values(TokenType).map((tokenType) => {
        return (
          <List.Dropdown.Item
            key={tokenType}
            title={tokenType === TokenType.generic ? "Generic tokens" : tokenType.toString() + " tokens"} // Generic is the only one not fitting properly so we transform it
            value={tokenType}
          />
        )
      })}
    </List.Dropdown>
  )
}
