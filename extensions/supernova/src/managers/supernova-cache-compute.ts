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
  ComponentProperty,
  ComponentPropertyLinkElementType,
  ComponentPropertyType,
  DesignComponent,
  DesignSystemVersion,
  DocSearchResultData,
  DocumentationGroup,
  DocumentationGroupBehavior,
  DocumentationPage,
  MarkdownTransform,
  MarkdownTransformType,
  Token,
  TokenGroup,
  TokenProperty,
  TokenType
} from "@supernovaio/supernova-sdk"
import { componentIconURL } from "../utilities/icons"
import { figmaComponentName, figmaComponentURL, fullGroupPath, fullPagePath, supernovaDeployedPageUrl, supernovaEditorUrl } from "../utilities/url"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

export type LightweightCachedAsset = {
  id: string
  brandId: string
  thumbnailUrl: string | null
  name: string
  description: string
}

export type LightweightCachedAssetGroup = {
  id: string
  brandId: string
  name: string
  path: Array<string>
  assets: Array<LightweightCachedAsset>
}

export type LightweightCachedToken = {
  id: string
  brandId: string
  name: string
  description: string
  tokenType: TokenType
  value: any
  properties: Array<TokenProperty>
  originName?: string
}

export type LightweightCachedTokenGroup = {
  id: string
  brandId: string
  name: string
  tokenType: TokenType
  path: Array<string>
  tokens: Array<LightweightCachedToken>
}

export type LightweightCachedComponent = {
  id: string
  brandId: string
  name: string
  thumbnailUrl: string | undefined
  properties: Array<ComponentProperty>
  propertyValues: object
  propertyUrls: object
  propertyNames: object
  propertyEditorUrls: object
  propertySiteUrls: object
}

export type LightweightCachedDocumentationGroup = {
  id: string
  title: string
  path: string
  pages: Array<LightweightCachedDocumentationPage>
}

export type LightweightCachedDocumentationPage = {
  id: string
  title: string
  path: string
  markdown: string | undefined
  description: string | undefined
  deployedPageUrl: string | undefined
  editorUrl: string | undefined
}

type LightweightSDKObject =
  | LightweightCachedComponent
  | LightweightCachedAsset
  | LightweightCachedToken
  | LightweightCachedTokenGroup
  | LightweightCachedAssetGroup
  | LightweightCachedDocumentationGroup
  | LightweightCachedDocumentationPage

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Search Instance

/** Cache compute layer that allows us to convert hefty SDK objects into lightweight objects that can be cached and contain all necessary information */
export class SupernovaCacheCompute {
  // --- Serialization / Deserialization

  serialize(item: Array<LightweightSDKObject | DocSearchResultData>): string {
    const ignoreKeys = ["referencedToken", "parent", "subgroups"]
    return JSON.stringify(item, function (key, value) {
      if (ignoreKeys.includes(key)) {
        return undefined
      } else {
        return value
      }
    })
  }

  serializeObject(item: object): string {
    return JSON.stringify(item, null, undefined)
  }

  deserialize<T>(data: string): Array<T> {
    return JSON.parse(data) as Array<T>
  }

  // --- Assets

  convertAssetData(assets: Array<Asset>, assetGroups: Array<AssetGroup>): Array<LightweightCachedAssetGroup> {
    return assetGroups.map((g) => this.convertAssetGroupIntoCacheableItem(g, assets))
  }

  private convertAssetIntoCacheableItem(asset: Asset): LightweightCachedAsset {
    return {
      id: asset.id,
      brandId: asset.brandId,
      thumbnailUrl: asset.thumbnailUrl,
      name: asset.name,
      description: asset.description
    }
  }

  private convertAssetGroupIntoCacheableItem(assetGroup: AssetGroup, assets: Array<Asset>): LightweightCachedAssetGroup {
    return {
      id: assetGroup.id,
      brandId: assetGroup.brandId,
      name: assetGroup.name,
      path: assetGroup.path,
      assets: assets.filter((a) => assetGroup.assetIds.includes(a.id)).map((a) => this.convertAssetIntoCacheableItem(a))
    }
  }

  // --- Tokens

  convertTokenData(tokens: Array<Token>, tokenGroups: Array<TokenGroup>): Array<LightweightCachedTokenGroup> {
    return tokenGroups.map((g) => this.convertTokenGroupIntoCacheableItem(g, tokens))
  }

  private convertTokenIntoCacheableItem(token: Token): LightweightCachedToken {
    // Note: Reconstruction of token value would be too difficult to do due to complexity, and also the interface is very complex.
    // We only care about removing the references from objects, so we just treat it as a value and remove
    // some specific attributes that could cause trouble (parent, references) while keeping the necessary information
    // Do note that some keys will be ignored by the JSON serializer
    const tokenData = {
      id: token.id,
      brandId: token.brandId,
      name: token.name,
      description: token.description,
      tokenType: token.tokenType,
      properties: token.properties,
      value: (token as any).value,
      originName: (token as any).value?.referencedToken?.origin?.name
    } as LightweightCachedToken

    return tokenData
  }

  private convertTokenGroupIntoCacheableItem(tokenGroup: TokenGroup, tokens: Array<Token>): LightweightCachedTokenGroup {
    return {
      id: tokenGroup.id,
      brandId: tokenGroup.brandId,
      name: tokenGroup.name,
      path: tokenGroup.path,
      tokenType: tokenGroup.tokenType,
      tokens: tokens.filter((t) => tokenGroup.tokenIds.includes(t.id)).map((t) => this.convertTokenIntoCacheableItem(t))
    }
  }

  // --- Components

  convertComponentData(
    components: Array<Component>,
    designComponents: Array<DesignComponent>,
    pages: Array<DocumentationPage>
  ): Array<LightweightCachedComponent> {
    return components.map((c) => this.convertComponentIntoCacheableItem(c, designComponents, pages))
  }

  private convertComponentIntoCacheableItem(
    component: Component,
    designComponents: Array<DesignComponent>,
    pages: Array<DocumentationPage>
  ): LightweightCachedComponent {
    const thumbnailUrl = componentIconURL(component, designComponents)
    const urls: any = {}
    const names: any = {}
    const propertyEditorUrls: any = {}
    const propertySiteUrls: any = {}
    const values = component.propertyValues

    // We'll precompute some data so we don't have to drag design component objects along, which are basically unserializable due to their complex referencing system
    for (const property of component.properties) {
      const value = (values as any)[property.codeName]
      if (property.linkElementType === ComponentPropertyLinkElementType.figmaComponent) {
        const figmaUrl = figmaComponentURL(component, property.id, designComponents)
        const figmaName = figmaComponentName(component, property.id, designComponents)
        urls[property.codeName] = figmaUrl
        names[property.codeName] = figmaName
      }

      if (property.propertyType === ComponentPropertyType.link && value && (property.linkElementType as any) === "DocumentationPage") {
        const editorUrl = supernovaEditorUrl(component, property.id, pages)
        const siteUrl = supernovaDeployedPageUrl(component, property.id, pages)
        propertyEditorUrls[property.codeName] = editorUrl
        propertySiteUrls[property.codeName] = siteUrl
      }
    }

    return {
      id: component.id,
      brandId: component.brandId,
      name: component.name,
      thumbnailUrl: thumbnailUrl,
      properties: component.properties,
      propertyValues: component.propertyValues,
      propertyUrls: urls,
      propertyNames: names,
      propertyEditorUrls: propertyEditorUrls,
      propertySiteUrls: propertySiteUrls
    }
  }

  // --- Documentation

  async convertDocumentationData(
    pages: Array<DocumentationPage>,
    documentationGroup: Array<DocumentationGroup>,
    version: DesignSystemVersion
  ): Promise<Array<LightweightCachedDocumentationGroup>> {
    const groups: Array<LightweightCachedDocumentationGroup> = []
    for (const group of documentationGroup) {
      groups.push(await this.convertDocumentationGroupIntoCacheableItem(group, version))
    }
    return groups
  }

  private async convertDocumentationPageIntoCacheableItem(page: DocumentationPage, version: DesignSystemVersion): Promise<LightweightCachedDocumentationPage> {
    const markdownConverter = new MarkdownTransform(MarkdownTransformType.commonmark, version)
    const markdown = await markdownConverter.convertPageToMarkdown(page)
    const editorUrl = page.editorPageUrl() ?? undefined
    const siteUrl = page.deployedDocsPageUrl() ?? undefined
    let description = page.configuration?.header?.description
    if (page.parent && page.parent.groupBehavior === DocumentationGroupBehavior.tabs) {
      description = page.parent?.configuration?.header?.description
    }

    return {
      id: page.id,
      title: page.title,
      editorUrl: editorUrl,
      deployedPageUrl: siteUrl,
      markdown: markdown,
      description: description,
      path: fullPagePath(page)
    }
  }

  private async convertDocumentationGroupIntoCacheableItem(
    documentationGroup: DocumentationGroup,
    version: DesignSystemVersion
  ): Promise<LightweightCachedDocumentationGroup> {
    const pages: Array<LightweightCachedDocumentationPage> = []
    for (const p of documentationGroup.pages) {
      pages.push(await this.convertDocumentationPageIntoCacheableItem(p, version))
    }
    return {
      id: documentationGroup.id,
      title: documentationGroup.title,
      path: fullGroupPath(documentationGroup),
      pages: pages
    }
  }
}
