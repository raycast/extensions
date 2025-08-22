import { getPreferenceValues, showToast, showHUD, Toast } from "@raycast/api"
import api from "./api"

export default async function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>()
  const xKey = preferences["x-key"]
  const port = preferences.port

  try {
    // First, get the current system proxy status
    const currentStatusResponse = await api(xKey, port).getSystemProxyStatus()
    const isCurrentlyEnabled = currentStatusResponse.data.enabled

    // Toggle the status
    const newStatus = !isCurrentlyEnabled
    await api(xKey, port).changeSystemProxyStatus(newStatus)

    // Show success message
    const action = newStatus ? "Enabled" : "Disabled"
    const icon = newStatus ? "💚" : "🚫"
    await showHUD(`${icon} System Proxy ${action}`)
  } catch (error) {
    console.log("🚀 ~ toggle-proxy.ts:23 ~ Command ~ error:", error)
    // Show error message
    await showToast(
      Toast.Style.Failure,
      "Failed to Toggle System Proxy",
      "Please check your X-Key, port and function availability"
    )
  }
}
