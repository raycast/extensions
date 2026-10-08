//
//  native.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { runAppleScript } from "run-applescript"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Native helpers

/** Put file into clipboard the same way as if user ctrl/cmd-c'd it in Finder */
export async function copyFileByPath(path: string) {
  try {
    const appleNativeCommand = `tell app "Finder" to set the clipboard to (POSIX file "${path}")`
    await runAppleScript(appleNativeCommand)
  } catch (e) {
    return String(e)
  }
}
