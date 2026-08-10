//
//  types.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Preferences

export interface Preferences {
  tokenNameTransformer: "camel" | "kebab" | "snake" | "lower" | "upper" | "original" | undefined
  documentationPagePrimaryAction: "docsSite" | "raycastDetail" | undefined
}
