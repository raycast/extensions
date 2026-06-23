import { showHUD } from "@raycast/api"
import { toggle } from "@kud/protonvpn"

export default async function Command() {
  const result = await toggle()
  if (result.action === "connect") {
    await showHUD("⚡ Connecting Proton VPN…")
    return
  }
  await showHUD(
    result.onDemandWillReconnect
      ? "⚠ Kill switch on — will reconnect; disable it in the app"
      : "Disconnecting Proton VPN…",
  )
}
