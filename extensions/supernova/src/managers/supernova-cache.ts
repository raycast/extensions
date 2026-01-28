//
//  supernova-cache.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import {
  Asset,
  AssetGroup,
  Component,
  DesignComponent,
  DesignSystemVersion,
  DocSearchResultData,
  DocumentationGroup,
  DocumentationPage,
  Token,
  TokenGroup
} from "@supernovaio/supernova-sdk"
import { Cache } from "@raycast/api"
import { CacheKeys } from "../definitions/constants"
import {
  LightweightCachedAssetGroup,
  LightweightCachedComponent,
  LightweightCachedDocumentationGroup,
  LightweightCachedTokenGroup,
  SupernovaCacheCompute
} from "./supernova-cache-compute"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

export enum CurrentSubscriptionContext {
  tokens,
  components,
  assets,
  documentation
}

export type CacheDataResponse<T> = (data: T, fromCache: boolean) => void
export type CacheErrorResponse = (error: Error) => void

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Search Instance

/** Cache intermediate layer */
export class SupernovaCache {
  // --- Properties

  private rayCache: Cache
  private cacheCompute: SupernovaCacheCompute

  private context: CurrentSubscriptionContext | undefined

  private successHandler: CacheDataResponse<any> | undefined
  private errorHandler: CacheErrorResponse | undefined

  // --- Constructor

  constructor() {
    this.rayCache = new Cache({
      // prettier-ignore
      capacity: 50 * (1024 ** 2) // Make cache a little bit larger, to handle larger design systems with sprawling docs
    })
    this.cacheCompute = new SupernovaCacheCompute()
    this.context = undefined

    this.successHandler = undefined
    this.errorHandler = undefined
  }

  // --- Management

  /** Unsubscribe current context subscription observer */
  unsubscribe() {
    this.context = undefined
    this.successHandler = undefined
    this.errorHandler = undefined
  }

  /** Delete all cached data */
  purgeCache() {
    this.rayCache.clear()
  }

  // --- Existing data

  /** Retrieve cached assets */
  cachedAssets(): Array<LightweightCachedAssetGroup> | undefined {
    const assetData = this.rayCache.get(CacheKeys.CACHE_KEY_ASSETS)
    if (assetData) {
      return this.cacheCompute.deserialize(assetData)
    }
    return undefined
  }

  /** Retrieve cached tokens */
  cachedTokens(): Array<LightweightCachedTokenGroup> | undefined {
    const tokenData = this.rayCache.get(CacheKeys.CACHE_KEY_TOKENS)
    if (tokenData) {
      return this.cacheCompute.deserialize(tokenData)
    }
    return undefined
  }

  /** Retrieve cached tokens */
  cachedComponents(): Array<LightweightCachedComponent> | undefined {
    const componentData = this.rayCache.get(CacheKeys.CACHE_KEY_COMPONENTS)
    if (componentData) {
      return this.cacheCompute.deserialize(componentData)
    }
    return undefined
  }

  /** Retrieve cached documentation */
  cachedDocs(): Array<LightweightCachedDocumentationGroup> | undefined {
    const docsData = this.rayCache.get(CacheKeys.CACHE_KEY_DOCS)
    if (docsData) {
      return this.cacheCompute.deserialize(docsData)
    }
    return undefined
  }

  /** Retrieve cached search index */
  cachedSearchIndex(): Array<DocSearchResultData> | undefined {
    const docsData = this.rayCache.get(CacheKeys.CACHE_KEY_DOCS_SEARCH_INDEX)
    if (docsData) {
      return this.cacheCompute.deserialize(docsData)
    }
    return undefined
  }

  // --- Subscriptions

  /** Subscribe to observe stored assets. If `respondWithExisting` is enabled, will immediately call response handler if there is some data set already */
  subscribeToAssets(response: CacheDataResponse<Array<LightweightCachedAssetGroup>>, error: CacheErrorResponse, respondWithExisting: boolean) {
    // Store observers
    this.successHandler = response
    this.errorHandler = error
    this.context = CurrentSubscriptionContext.assets

    // Check that assets exist and reply if that is the case
    const cachedAssets = this.cachedAssets()
    if (respondWithExisting && cachedAssets) {
      this.successHandler(cachedAssets, true)
    }
  }

  /** Subscribe to observe stored tokens. If `respondWithExisting` is enabled, will immediately call response handler if there is some data set already */
  subscribeToTokens(response: CacheDataResponse<Array<LightweightCachedTokenGroup>>, error: CacheErrorResponse, respondWithExisting: boolean) {
    // Store observers
    this.successHandler = response
    this.errorHandler = error
    this.context = CurrentSubscriptionContext.tokens

    // Check that assets exist and reply if that is the case
    const cachedTokens = this.cachedTokens()
    if (respondWithExisting && cachedTokens) {
      this.successHandler(cachedTokens, true)
    }
  }

  /** Subscribe to observe stored components. If `respondWithExisting` is enabled, will immediately call response handler if there is some data set already */
  subscribeToComponents(response: CacheDataResponse<Array<LightweightCachedComponent>>, error: CacheErrorResponse, respondWithExisting: boolean) {
    // Store observers
    this.successHandler = response
    this.errorHandler = error
    this.context = CurrentSubscriptionContext.components

    // Check that assets exist and reply if that is the case
    const cachedComponents = this.cachedComponents()
    if (respondWithExisting && cachedComponents) {
      this.successHandler(cachedComponents, true)
    }
  }

  /** Subscribe to observe stored documentation items. If `respondWithExisting` is enabled, will immediately call response handler if there is some data set already */
  subscribeToDocumentationItems(
    response: CacheDataResponse<Array<LightweightCachedDocumentationGroup>>,
    error: CacheErrorResponse,
    respondWithExisting: boolean
  ) {
    // Store observers
    this.successHandler = response
    this.errorHandler = error
    this.context = CurrentSubscriptionContext.documentation

    // Check that assets exist and reply if that is the case
    const cachedDocs = this.cachedDocs()
    if (respondWithExisting && cachedDocs) {
      this.successHandler(cachedDocs, true)
    }
  }

  // --- Data update

  setFetchedAssets(assets: Array<Asset>, groups: Array<AssetGroup>) {
    // Convert to cacheable objects
    const cacheableItems = this.cacheCompute.convertAssetData(assets, groups)

    // Store to cache
    this.rayCache.set(CacheKeys.CACHE_KEY_ASSETS, this.cacheCompute.serialize(cacheableItems))

    // Notify
    if (this.successHandler && this.context === CurrentSubscriptionContext.assets) {
      this.successHandler(cacheableItems, false)
    }
  }

  setFetchedTokens(tokens: Array<Token>, groups: Array<TokenGroup>) {
    // Convert to cacheable objects
    const cacheableItems = this.cacheCompute.convertTokenData(tokens, groups)

    // Store to cache
    this.rayCache.set(CacheKeys.CACHE_KEY_TOKENS, this.cacheCompute.serialize(cacheableItems))

    // Notify
    if (this.successHandler && this.context === CurrentSubscriptionContext.tokens) {
      this.successHandler(cacheableItems, false)
    }
  }

  setFetchedComponents(components: Array<Component>, groups: Array<DesignComponent>, pages: Array<DocumentationPage>) {
    // Convert to cacheable objects
    const cacheableItems = this.cacheCompute.convertComponentData(components, groups, pages)

    // Store to cache
    this.rayCache.set(CacheKeys.CACHE_KEY_COMPONENTS, this.cacheCompute.serialize(cacheableItems))

    // Notify
    if (this.successHandler && this.context === CurrentSubscriptionContext.components) {
      this.successHandler(cacheableItems, false)
    }
  }

  async setFetchedDocumentationItems(pages: Array<DocumentationPage>, groups: Array<DocumentationGroup>, version: DesignSystemVersion) {
    // Convert to cacheable objects
    const cacheableItems = await this.cacheCompute.convertDocumentationData(pages, groups, version)

    // Store to cache
    this.rayCache.set(CacheKeys.CACHE_KEY_DOCS, this.cacheCompute.serialize(cacheableItems))

    // Notify
    if (this.successHandler && this.context === CurrentSubscriptionContext.documentation) {
      this.successHandler(cacheableItems, false)
    }
  }

  setSearchIndex(index: object) {
    // Store to cache
    this.rayCache.set(CacheKeys.CACHE_KEY_DOCS_SEARCH_INDEX, this.cacheCompute.serializeObject(index))
  }
}
