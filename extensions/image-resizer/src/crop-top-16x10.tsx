import { getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api"
import { access, stat } from "node:fs/promises"

import { cropTop16x10, MAX_BYTES } from "./crop"

async function validateImagePath(path: string): Promise<void> {
  try {
    await access(path)
  } catch {
    throw new Error("Selected image does not exist.")
  }

  const file = await stat(path)

  if (!file.isFile()) {
    throw new Error("Select one image file in Finder.")
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Image is larger than 80MB.")
  }
}

async function getSelectedImagePath(): Promise<string> {
  const selectedItems = await getSelectedFinderItems()

  if (selectedItems.length !== 1) {
    throw new Error("Select exactly one image file in Finder.")
  }

  return selectedItems[0].path
}

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Cropping selected image",
  })

  try {
    const imagePath = await getSelectedImagePath()
    await validateImagePath(imagePath)

    const result = await cropTop16x10(imagePath)

    toast.style = Toast.Style.Success
    toast.title = "Saved cropped image"
    toast.message = `${result.width} x ${result.height}px`
    await showHUD("Saved cropped image")
  } catch (error) {
    toast.style = Toast.Style.Failure
    toast.title = "Crop failed"
    toast.message = error instanceof Error ? error.message : "Unknown error"
  }
}
