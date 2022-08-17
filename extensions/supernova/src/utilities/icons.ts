//
//  contrast.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Image } from "@raycast/api"
import { ColorToken, Component, ComponentPropertyLinkElementType, ComponentPropertyType, DesignComponent, TokenType } from "@supernovaio/supernova-sdk"
import { ColorTokenValue } from "@supernovaio/supernova-sdk/build/Typescript/src/model/tokens/SDKTokenValue"
import tinycolor from "tinycolor2"
import { LightweightCachedAsset, LightweightCachedComponent, LightweightCachedToken } from "../managers/supernova-cache-compute"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Icon helpers

/** Retrieve appropriate visual representation of tokens, if possible */
export function tokenIcon(token: LightweightCachedToken): Image.ImageLike | undefined {
  switch (token.tokenType) {
    case TokenType.color:
      return colorIcon((token as ColorToken).value)
    default:
      return {
        source: {
          light: `${token.tokenType.toString().toLowerCase()}-light.png`,
          dark: `icons/${token.tokenType.toString().toLowerCase()}-dark.png`
        }
      }
  }
}

/** Retrieve appropriate visual representation of color token, if possible */
export function colorIcon(token: ColorTokenValue): Image.ImageLike | undefined {
  // Tint preview image with a color
  return colorIconUsingHex(tinycolor(token.hex).toRgbString())
}

/** Retrieve appropriate visual representation of color token using hex definition, if possible */
export function colorIconUsingHex(hex: string):
  | {
      source: string
      tintColor: string
    }
  | undefined {
  // Tint preview image with a color
  return {
    source: "color-preview.png",
    tintColor: tinycolor(hex).toRgbString()
  }
}

/** Retrieve appropriate preview (actual rendered design component) of component, if possible. Note that resolutions are not suited for small previews (20x20), and should be used for full-page previews only */
export function componentIconURL(component: Component, designComponents: Array<DesignComponent>): string | undefined {
  // Find design component associated with this component
  const values = component.propertyValues
  for (const property of component.properties) {
    if (property.propertyType === ComponentPropertyType.link && property.linkElementType === ComponentPropertyLinkElementType.figmaComponent) {
      const value = (values as any)[property.codeName]
      // Object is set - search for it in design components
      if (value) {
        const dc = designComponents.filter((d) => d.id === value)[0]
        if (dc && dc.thumbnailUrl) {
          return dc.thumbnailUrl
        }
      }
    }
  }

  return undefined
}

/** Retrieve icon representation of component */
/* eslint-disable */
export function componentIcon(component: LightweightCachedComponent): Image.ImageLike | undefined {
  return {
    source: {
      light: `icons/component-light.png`,
      dark: `icons/component-dark.png`
    }
  }
}

/** Retrieve icon representation of Figma link */
export function figmaIcon(): Image.ImageLike | undefined {
  return {
    source: {
      light: `icons/figma.png`,
      dark: `icons/figma.png`
    }
  }
}

/** Retrieve icon representation of boolean value */
export function booleanIcon(booleanValue: boolean): Image.ImageLike | undefined {
  return {
    source: {
      light: `icons/${booleanValue ? "yes" : "no"}.png`,
      dark: `icons/${booleanValue ? "yes" : "no"}.png`
    }
  }
}

/** Retrieve appropriate visual representation of asset, if possible */
export function assetIcon(asset: LightweightCachedAsset): Image.ImageLike | undefined {
  if (asset.thumbnailUrl) {
    return { source: asset.thumbnailUrl }
  }

  return undefined
}
