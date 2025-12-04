//
//  toasts.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { showToast, Toast } from "@raycast/api"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Toast helpers

/** Show native error toast */
export const showErrorToast = async (message: string) => {
  await showToast({
    title: "Uh-oh, something is wrong",
    message: message,
    style: Toast.Style.Failure
  })
}

/** Show native success toast */
export const showSuccessToast = async (title: string | undefined, message: string) => {
  await showToast({
    title: title ?? "All good!",
    message: message,
    style: Toast.Style.Success
  })
}
