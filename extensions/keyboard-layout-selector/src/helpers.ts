import { openCommandPreferences, showHUD, updateCommandMetadata } from "@raycast/api"
import { LayoutManager } from "./model/LayoutManager"

export default async function handleLayoutSelect (selectedId: string) {
  if (selectedId) {
    await updateCommandMetadata({ subtitle: `Selecting: ${selectedId}` })
    return await LayoutManager.setSelectedInput(selectedId)
  }

  await openCommandPreferences()
  return await showHUD("❌ Please set a text to paste")
}
