//
//  contrast.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { ColorToken } from "@supernovaio/supernova-sdk"
const namer = require("color-namer")

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Contrast helpers

/** Retrieves contrast ratio between two colors */
export function contrast(rgb1: Array<number>, rgb2: Array<number>) {
  const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2])
  const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2])
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

/** Computes luminance of single color */
function luminance(r: number, g: number, b: number) {
  const a = [r, g, b].map(function (v) {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

/** Computes closes pantone color  and returns its name */
export function closestPantone(colorToken: ColorToken):
  | {
      name: string
      hex: string
    }
  | undefined {
  const hex = `#${colorToken.value.hex.substring(0, 6)}`
  const pantoneOptions = namer(hex, {
    pick: ["pantone"],
    distance: "deltaE"
  })

  const option = pantoneOptions.pantone ? pantoneOptions.pantone[0] : undefined
  return option
    ? {
        name: option.name,
        hex: option.hex
      }
    : undefined
}
