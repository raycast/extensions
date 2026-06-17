//
//  props.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Grid } from "@raycast/api"
import { DocSearchResult, DocSearchResultDataType, AssetFormat, AssetScale, ComponentProperty, Token, TokenType } from "@supernovaio/supernova-sdk"
import {
  LightweightCachedAsset,
  LightweightCachedAssetGroup,
  LightweightCachedComponent,
  LightweightCachedDocumentationGroup,
  LightweightCachedDocumentationPage,
  LightweightCachedToken,
  LightweightCachedTokenGroup
} from "../managers/supernova-cache-compute"
import { SupernovaSDK } from "../managers/supernova-sdk"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Docs

export interface DocPageDetailActionProps {
  page: LightweightCachedDocumentationPage
  canPushDetail: boolean
}

export interface DocPageDetailState {
  markdown: string | undefined
  isLoading: boolean
}

export interface DocPageDetailViewProps {
  page: LightweightCachedDocumentationPage
}

export interface DocSearchState {
  data: Array<LightweightCachedDocumentationGroup>
  pages: Array<LightweightCachedDocumentationPage>
  results: Array<DocSearchResult>
  searchQuery: string
  isLoading: boolean
}

export interface DocumentationSectionProps {
  group: LightweightCachedDocumentationGroup
}

export interface DocumentationPageItemProps {
  page: LightweightCachedDocumentationPage
}

export interface SearchSectionProps {
  type: DocSearchResultDataType
  results: Array<DocSearchResult>
  pages: Array<LightweightCachedDocumentationPage>
}

export interface SearchListItemProps {
  searchResult: DocSearchResult
  page: LightweightCachedDocumentationPage
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Components

export interface ComponentDetailActionProps {
  component: LightweightCachedComponent
}

export interface ComponentCopyLinkActionProps {
  component: LightweightCachedComponent
}
export interface ComponentDetailViewProps {
  component: LightweightCachedComponent
}

export interface ComponentLabelProps {
  component: LightweightCachedComponent
  property: ComponentProperty
}

export interface ComponentSearchState {
  data: Array<LightweightCachedComponent>
  filteredData: Array<LightweightCachedComponent>
  searchQuery: string
  isLoading: boolean
}

export interface ComponentSectionProps {
  components: Array<LightweightCachedComponent>
}

export interface ComponentListItemProps {
  component: LightweightCachedComponent
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Assets

export interface AssetActionProps {
  asset: LightweightCachedAsset
  sdk: SupernovaSDK
}

export interface AssetActionItemProps {
  asset: LightweightCachedAsset
  sdk: SupernovaSDK
  scale: AssetScale
  format: AssetFormat
}
export interface AssetSearchState {
  data: Array<LightweightCachedAssetGroup>
  filteredData: Array<LightweightCachedAssetGroup>
  searchQuery: string
  isLoading: boolean
  viewSize: Grid.ItemSize
}

export interface AssetSectionProps {
  assetGroups: Array<LightweightCachedAssetGroup>
  sdk: SupernovaSDK
}

export interface AssetItemProps {
  asset: LightweightCachedAsset
  assetGroup: LightweightCachedAssetGroup
  sdk: SupernovaSDK
}

export interface SizeDropdownProps {
  onChange: (size: Grid.ItemSize) => void
}
// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Tokens

export interface TokenDetailActionsProps {
  token: LightweightCachedToken
  tokenGroup: LightweightCachedTokenGroup
}

export interface TokenCopyValueActionsProps {
  token: LightweightCachedToken
  tokenGroup: LightweightCachedTokenGroup
}

export interface TokenCopyCustomPropertyActionsProps {
  token: LightweightCachedToken
  tokenGroup: LightweightCachedTokenGroup
}
export interface TokenDetailViewProps {
  token: LightweightCachedToken
  tokenGroup: LightweightCachedTokenGroup
}

export interface TokenValueViewProps<T extends Token> {
  token: T
}

export interface TokenSearchState {
  data: Array<LightweightCachedTokenGroup>
  filteredData: Array<LightweightCachedTokenGroup>
  searchQuery: string
  isLoading: boolean
  categoryFilter: TokenType | undefined
}

export interface TokenSectionsProps {
  tokenGroups: Array<LightweightCachedTokenGroup>
  categoryFilter: TokenType | undefined
}

export interface TokenSectionProps {
  type: TokenType
  tokenGroups: Array<LightweightCachedTokenGroup>
}

export interface TokenListItemProps {
  token: LightweightCachedToken
  tokenGroup: LightweightCachedTokenGroup
  keywords: string
}

export interface TypeDropdownProps {
  onChange: (type: TokenType | undefined) => void
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Auxiliary

export interface SelectDesignSystemProps {
  onAuthSuccess: () => void
}

export interface OnboardingProps {
  child: JSX.Element
  onAuthSuccess: () => void
}

export interface AuthLockProps {
  authenticatedChild: JSX.Element
}
