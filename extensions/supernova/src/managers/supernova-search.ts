//
//  supernova-search.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { DocSearch, DocSearchResult, DocSearchResultData, DocumentationPage } from "@supernovaio/supernova-sdk"
import { LightweightCachedAssetGroup, LightweightCachedComponent, LightweightCachedTokenGroup } from "./supernova-cache-compute"
import Fuse from "fuse.js"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Search Instance

/** Search manager */
export class SupernovaSearch {
  // --- Properties

  searchEngine: DocSearch

  // --- Constructor

  constructor() {
    this.searchEngine = new DocSearch(DocSearch.defaultFuzzyConfiguration())
  }

  // --- Search index for documentation

  /* Removes previous data from search index and creates new one */
  updateSearchIndex = (pages: Array<DocumentationPage>): Array<DocSearchResultData> => {
    return this.searchEngine.updateSearchIndex(pages)
  }

  /* Removes previous data from search index and creates new one used serialized index */
  updateSearchIndexFromCache = (data: Array<DocSearchResultData>) => {
    this.searchEngine.searchEngine = new Fuse(data, DocSearch.defaultFuzzyConfiguration())
  }

  /* Removes previous data from search index and creates new one */
  search(input: string): Array<DocSearchResult> {
    return this.searchEngine.search(input)
  }

  // --- Local search

  searchAssets(query: string, assetGroups: Array<LightweightCachedAssetGroup>): Array<LightweightCachedAssetGroup> {
    const lowercaseQuery = query.toLowerCase()
    const filteredGroups = new Array<LightweightCachedAssetGroup>()

    assetGroups.forEach((g) => {
      const filteredAssets = g.assets.filter((t) => t.name.toLowerCase().includes(lowercaseQuery)) ?? []
      if (filteredAssets.length > 0) {
        filteredGroups.push({ ...g, assets: filteredAssets })
      }
    })

    return filteredGroups
  }

  searchTokens(query: string, tokenGroups: Array<LightweightCachedTokenGroup>): Array<LightweightCachedTokenGroup> {
    const lowercaseQuery = query.toLowerCase()
    const filteredGroups = new Array<LightweightCachedTokenGroup>()

    tokenGroups.forEach((g) => {
      const filteredTokens = g.tokens.filter((t) => t.name.toLowerCase().includes(lowercaseQuery)) ?? []
      if (filteredTokens.length > 0) {
        filteredGroups.push({ ...g, tokens: filteredTokens })
      }
    })

    return filteredGroups
  }

  searchComponents(query: string, components: Array<LightweightCachedComponent>): Array<LightweightCachedComponent> {
    const lowercaseQuery = query.toLowerCase()
    return components.filter((c) => {
      c.name.toLowerCase().includes(lowercaseQuery)
    })
  }
}
