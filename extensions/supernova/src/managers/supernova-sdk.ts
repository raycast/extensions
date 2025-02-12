//
//  supernova-sdk.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import {
  Asset,
  AssetFormat,
  AssetGroup,
  AssetScale,
  Brand,
  Component,
  DesignComponent,
  DesignSystemVersion,
  Documentation,
  DocumentationGroup,
  DocumentationPage,
  RenderedAsset,
  Supernova,
  Token,
  TokenGroup
} from "@supernovaio/supernova-sdk"
import { SupernovaAuthentication } from "./supernova-authentication"
import { CacheDataResponse, CacheErrorResponse, SupernovaCache } from "./supernova-cache"
import {
  LightweightCachedAsset,
  LightweightCachedAssetGroup,
  LightweightCachedComponent,
  LightweightCachedDocumentationGroup,
  LightweightCachedTokenGroup
} from "./supernova-cache-compute"
import { SupernovaSearch } from "./supernova-search"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - SDK Instance

/** Hook that provides access to Supernova backend functionality, that will retain all required information inside it */
export class SupernovaSDK {
  // --- Singleton

  private static instance: SupernovaSDK
  private constructor() {
    SupernovaSDK.instance = this
    this.searchIndex = new SupernovaSearch()
    this.cache = new SupernovaCache()
  }

  static getInstance() {
    if (!SupernovaSDK.instance) {
      this.instance = new SupernovaSDK()
    }

    return this.instance
  }

  // --- Properties

  sdkInstance: Supernova | undefined = undefined
  designSystemId: string | undefined = undefined
  cachedVersion: DesignSystemVersion | undefined = undefined
  cachedBrands: Array<Brand> | undefined = undefined
  cachedDocs: Documentation | undefined = undefined

  searchIndex: SupernovaSearch
  cache: SupernovaCache

  // --- Authenticatoin

  /** Authenticate SDK accessor */
  authenticate = (apiKey: string, dsId: string) => {
    this.sdkInstance = new Supernova(apiKey, null, null)
    this.designSystemId = dsId
  }

  /** Logs out active user */
  logout = async () => {
    await SupernovaAuthentication.getInstance().logout()
    this.cache.purgeCache()
  }

  /** Makes sure user is authenticated. If not, will throw */
  private makeSureIsAuthenticated = async () => {
    const authentication = SupernovaAuthentication.getInstance()
    await authentication.autoauthenticate(this)
  }

  /** Retrieve prepared SDK instance. Keep in mind that authenticate() must be called before the hook can be used to retrieve data */
  private getProtectedSDKInstance = (): Supernova => {
    if (!this.sdkInstance) {
      throw new Error("Authenticate() must be called before SDK can be used")
    }
    return this.sdkInstance
  }

  // --- Data Retrieval

  /** Get writable version */
  getVersion = async (): Promise<DesignSystemVersion> => {
    if (!this.sdkInstance) {
      throw new Error("Authenticate() must be called before SDK can be used")
    }
    // Retrieve cached version if available
    if (this.cachedVersion) {
      return this.cachedVersion
    }

    // Fetch design system and its active version from which we can pull the data from. Will throw if not present
    const designSystem = await this.getProtectedSDKInstance().designSystem(this.designSystemId!)
    this.cachedVersion = await designSystem!.activeVersion()
    return this.cachedVersion
  }

  getBrands = async (): Promise<Array<Brand>> => {
    // Retrieve cached docs if needed
    if (this.cachedBrands) {
      return this.cachedBrands
    }

    const version = await this.getVersion()
    this.cachedBrands = await version.brands()
    return this.cachedBrands
  }

  /** Get main documentation object */
  getDocumentationAccessor = async (): Promise<Documentation> => {
    // Retrieve cached docs if needed
    if (this.cachedDocs) {
      return this.cachedDocs
    }

    const version = await this.getVersion()
    this.cachedDocs = await version.documentation()
    return this.cachedDocs
  }

  /** Get all available documentation pages */
  getDocumentationPages = async (): Promise<Array<DocumentationPage>> => {
    const docs = await this.getDocumentationAccessor()
    const pages = await docs.pages()
    this.searchIndex.updateSearchIndex(pages)
    return pages
  }

  /** Get all available documentation groups */
  getDocumentationGroups = async (): Promise<Array<DocumentationGroup>> => {
    const docs = await this.getDocumentationAccessor()
    const groups = await docs.groups()
    return groups
  }

  /** Get all available tokens */
  getTokens = async (): Promise<Array<Token>> => {
    const version = await this.getVersion()
    const tokens = await version.tokens()
    return tokens
  }

  /** Get all available token groups */
  getTokenGroups = async (): Promise<Array<TokenGroup>> => {
    const version = await this.getVersion()
    const groups = await version.tokenGroups()
    return groups
  }

  /** Get all available assets */
  getAssets = async (): Promise<Array<Asset>> => {
    const version = await this.getVersion()
    const assets = await version.assets()
    return assets
  }

  /** Get all available asset groups */
  getAssetGroups = async (): Promise<Array<AssetGroup>> => {
    const version = await this.getVersion()
    const groups = await version.assetGroups()
    return groups
  }

  /** Get all available components */
  getComponents = async (): Promise<Array<Component>> => {
    const version = await this.getVersion()
    const components = await version.components()
    return components
  }

  /** Get all available components */
  getDesignComponents = async (): Promise<Array<DesignComponent>> => {
    const version = await this.getVersion()
    const components = await version.designComponents()
    return components
  }

  // --- Rendering

  /** Ask server to create visual representation of an asset */
  retrieveDownloadAssetPath = async (asset: LightweightCachedAsset, format: AssetFormat, scale: AssetScale): Promise<RenderedAsset | null> => {
    if (!this.cachedVersion) {
      await this.getVersion()
    }
    const coreAssets = await this.getAssets()
    const result = await this.cachedVersion!.specificRenderedAssets(
      coreAssets.filter((a) => a.id === asset.id),
      format,
      scale
    )
    return result[0] ?? null
  }

  // --- Cache Integration

  /** Subscribe to changes in available assets */
  async getCachedOrNewAssets(response: CacheDataResponse<Array<LightweightCachedAssetGroup>>, error: CacheErrorResponse) {
    try {
      // Authentication is required for this call
      await this.makeSureIsAuthenticated()

      // Subscribe to cache, might immediately return the result
      this.cache.subscribeToAssets(response, error, true)

      // Refresh the asset data and store them
      const assets = await this.getAssets()
      const groups = await this.getAssetGroups()
      this.cache.setFetchedAssets(assets, groups)
    } catch (err: any) {
      error(err)
    }
  }

  /** Subscribe to changes in available tokens */
  async getCachedOrNewTokens(response: CacheDataResponse<Array<LightweightCachedTokenGroup>>, error: CacheErrorResponse) {
    try {
      // Authentication is required for this call
      await this.makeSureIsAuthenticated()

      // Subscribe to cache, might immediately return the result
      this.cache.subscribeToTokens(response, error, true)

      // Refresh the token data and store them
      const tokens = await this.getTokens()
      const groups = await this.getTokenGroups()
      this.cache.setFetchedTokens(tokens, groups)
    } catch (err: any) {
      error(err)
    }
  }

  /** Subscribe to changes in available tokens */
  async getCachedOrNewComponents(response: CacheDataResponse<Array<LightweightCachedComponent>>, error: CacheErrorResponse) {
    try {
      // Authentication is required for this call
      await this.makeSureIsAuthenticated()

      // Subscribe to cache, might immediately return the result
      this.cache.subscribeToComponents(response, error, true)

      // Refresh the component data and store them
      const components = await this.getComponents()
      const designComponents = await this.getDesignComponents()
      const pages = await this.getDocumentationPages()

      this.cache.setFetchedComponents(components, designComponents, pages)
    } catch (err: any) {
      error(err)
    }
  }

  /** Subscribe to changes in available tokens */
  async getCachedOrNewDocumentationItems(response: CacheDataResponse<Array<LightweightCachedDocumentationGroup>>, error: CacheErrorResponse) {
    try {
      // Authentication is required for this call
      await this.makeSureIsAuthenticated()

      // Retrieve and restore the search index engine cache if exists
      const index = this.cache.cachedSearchIndex()
      if (index) {
        this.searchIndex.updateSearchIndexFromCache(index)
      }

      // Subscribe to cache, might immediately return the result
      this.cache.subscribeToDocumentationItems(response, error, true)

      // Refresh the documentation data and store them
      const pages = await this.getDocumentationPages()
      const groups = await this.getDocumentationGroups()
      const version = await this.getVersion()

      // Rebuild index, save to cache, retrieve
      const data = this.searchIndex.updateSearchIndex(pages)
      if (data) {
        this.cache.setSearchIndex(data)
      }

      this.cache.setFetchedDocumentationItems(pages, groups, version)
    } catch (err: any) {
      error(err)
    }
  }
}
