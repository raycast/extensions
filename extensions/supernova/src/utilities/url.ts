//
//  markdown.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import {
  AssetFormat,
  AssetScale,
  Component,
  ComponentPropertyLinkElementType,
  ComponentPropertyType,
  DesignComponent,
  DocumentationGroup,
  DocumentationPage,
  RenderedAsset,
  Token,
  TokenGroup
} from "@supernovaio/supernova-sdk"

import { homedir } from "os"
import { environment } from "@raycast/api"
import { LightweightCachedAssetGroup, LightweightCachedTokenGroup } from "../managers/supernova-cache-compute"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - URL helpers

/** Converts a single block - depending on the type - to a commonmark definition that can be rendered by Raycast */

/** Generate group slug for the generated group */
export function fullGroupPath(object: DocumentationGroup): string {
  const subpaths: Array<string> = []

  // Construct group path segments
  let parent: DocumentationGroup | null = object
  while (parent) {
    subpaths.push(slugify(parent.title))
    parent = parent.parent
  }

  // Remove last segment added, because we don't care about root group
  subpaths.pop()

  // Retrieve url-safe path constructed as [group-slugs].m(/)
  const path = [...subpaths.reverse()].join("/")
  return path
}

/** Generate page or group slug for the generated page */
export function fullPagePath(object: DocumentationPage | DocumentationGroup): string {
  let page: DocumentationPage | null = null
  if (object.type === "Page") {
    page = object as DocumentationPage
  } else {
    page = firstPageFromTop(object as DocumentationGroup)
  }

  if (!page) {
    return ""
  }

  const pageSlug = page.userSlug ?? page.slug
  const subpaths: Array<string> = []

  // Construct group path segments
  let parent: DocumentationGroup | null = page.parent
  while (parent) {
    subpaths.push(slugify(parent.title))
    parent = parent.parent
  }

  // Remove last segment added, because we don't care about root group
  subpaths.pop()

  // Retrieve url-safe path constructed as [host][group-slugs][path-slug][.html]
  const path = [...subpaths.reverse(), pageSlug].join("/")
  return path
}

/** Generate group slug for the generated group */
export function fullTokenPath(object: Token, separator: string): string {
  const segments: Array<string> = []
  segments.push(object.name)

  // Construct path segments
  let parent: TokenGroup | null = object.parent
  while (parent) {
    segments.push(parent.name)
    parent = parent.parent
  }

  // Important: We don't want to show the top category, as it is only virtual
  segments.pop()
  segments.reverse()
  return segments.join(separator)
}

/** Generate group slug for the generated group */
export function fullTokenGroupPath(object: LightweightCachedTokenGroup, separator: string): string {
  const segments: Array<string> = [...object.path, object.name]
  return segments.join(separator)
}

/** Generate group slug for the generated group */
export function fullAssetGroupPath(object: LightweightCachedAssetGroup, separator: string): string {
  const segments: Array<string> = [...object.path, object.name]
  return segments.join(separator)
}

/** Generate figma component URL to be opened in browser. Will link to a specific Figma frame */
export function figmaComponentURL(component: Component, propertyId: string, designComponents: Array<DesignComponent>): string | undefined {
  // Find design component associated with this component
  const values = component.propertyValues
  for (const property of component.properties) {
    if (
      property.propertyType === ComponentPropertyType.link &&
      property.linkElementType === ComponentPropertyLinkElementType.figmaComponent &&
      property.id === propertyId
    ) {
      const value = (values as any)[property.codeName]
      // Object is set - search for it in design components, create design component url, encode it and retrieve - if anything fails, don't retrieve it at all
      if (value) {
        const dc = designComponents.filter((d) => d.id === value)[0]
        if (dc && dc.origin) {
          const url = dc.origin.remoteDesignComponentUrl()
          if (url) {
            return encodeURI(url)
          }
        }
      }
    }
  }

  return undefined
}

/** Generate figma component name from the design component linked in properties */
export function figmaComponentName(component: Component, propertyId: string, designComponents: Array<DesignComponent>): string | undefined {
  // Find design component associated with this component
  const values = component.propertyValues
  for (const property of component.properties) {
    if (
      property.propertyType === ComponentPropertyType.link &&
      property.linkElementType === ComponentPropertyLinkElementType.figmaComponent &&
      property.id === propertyId
    ) {
      const value = (values as any)[property.codeName]
      // Object is set - search for it in design components, create design component url, encode it and retrieve - if anything fails, don't retrieve it at all
      if (value) {
        const dc = designComponents.filter((d) => d.id === value)[0]
        if (dc) {
          return dc.name
        }
      }
    }
  }

  return undefined
}

/** Generate Supernova editor URL to be opened in the browser */
export function supernovaEditorUrl(component: Component, propertyId: string, documentationPages: Array<DocumentationPage>): string | undefined {
  // Find design component associated with this component
  const values = component.propertyValues
  for (const property of component.properties) {
    if (
      property.propertyType === ComponentPropertyType.link &&
      (property.linkElementType as any) === "DocumentationPage" && // Needs fix in SDK
      property.id === propertyId
    ) {
      const value = (values as any)[property.codeName]
      // Object is set - search for it in design components, create design component url, encode it and retrieve - if anything fails, don't retrieve it at all
      if (value) {
        const dp = documentationPages.filter((p) => p.persistentId === value)[0]
        if (dp && dp.editorPageUrl()) {
          return encodeURI(dp.editorPageUrl()!)
        }
      }
    }
  }

  return undefined
}

/** Generate supernova site URL to be opened in the browser */
export function supernovaDeployedPageUrl(component: Component, propertyId: string, documentationPages: Array<DocumentationPage>): string | undefined {
  // Find design component associated with this component
  const values = component.propertyValues
  for (const property of component.properties) {
    if (
      property.propertyType === ComponentPropertyType.link &&
      (property.linkElementType as any) === "DocumentationPage" && // Needs fix in SDK
      property.id === propertyId
    ) {
      const value = (values as any)[property.codeName]
      // Object is set - search for it in design components, create design component url, encode it and retrieve - if anything fails, don't retrieve it at all
      if (value) {
        const dp = documentationPages.filter((p) => p.persistentId === value)[0]
        if (dp && dp.deployedDocsPageUrl()) {
          return encodeURI(dp.deployedDocsPageUrl()!)
        }
      }
    }
  }

  return undefined
}

/** Generate download url for asset */
export function assetLocalDownloadToUserDownloadsPath(asset: RenderedAsset): string {
  const downloadFolder = `${homedir()}/Downloads`
  switch (asset.format) {
    case AssetFormat.pdf:
      return `${downloadFolder}/${slugify(asset.originalName)}.pdf`
    case AssetFormat.svg:
      return `${downloadFolder}/${slugify(asset.originalName)}.svg`
    case AssetFormat.png:
      return `${downloadFolder}/${slugify(asset.originalName)}${scaleToExtension(asset.scale)}.png`
  }
}

/** Generate download support url for asset */
export function assetLocalDownloadToSupportPath(asset: RenderedAsset): string {
  const downloadFolder = `${environment.supportPath}`
  switch (asset.format) {
    case AssetFormat.pdf:
      return `${downloadFolder}/${slugify(asset.originalName)}.pdf`
    case AssetFormat.svg:
      return `${downloadFolder}/${slugify(asset.originalName)}.svg`
    case AssetFormat.png:
      return `${downloadFolder}/${slugify(asset.originalName)}${scaleToExtension(asset.scale)}.png`
  }
}

function scaleToExtension(scale: AssetScale): string {
  switch (scale) {
    case AssetScale.x1:
      return ""
    case AssetScale.x2:
      return "@2x"
    case AssetScale.x3:
      return "@3x"
    case AssetScale.x4:
      return "@4x"
  }
}

/** Find first showable page from the top of the provided root */
export function firstPageFromTop(documentationRoot: DocumentationGroup): DocumentationPage | null {
  for (const child of documentationRoot.children) {
    if (child.type === "Page") {
      return child as DocumentationPage
    } else {
      const possiblePage = firstPageFromTop(child as DocumentationGroup)
      if (possiblePage) {
        return possiblePage
      }
    }
  }
  return null
}

function slugify(str: string): string {
  if (!str) {
    return ""
  }

  // Thanks to https://gist.github.com/codeguy/6684588
  str = str.replace(/^\s+|\s+$/g, "")
  str = str.toLowerCase()

  // remove accents, swap ñ for n, etc
  const from = "àáãäâèéëêìíïîòóöôùúüûñç·/_,:;"
  const to = "aaaaaeeeeiiiioooouuuunc------"

  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i))
  }

  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-") // collapse dashes

  return str
}
