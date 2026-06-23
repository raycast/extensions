import { showHUD } from "@raycast/api"
import { disconnect, getStatus } from "@kud/protonvpn"

export default async function Command() {
  const status = await getStatus()
  if (!status.connected && status.state !== "connecting") {
    await showHUD("Proton VPN already disconnected")
    return
  }
  const result = await disconnect()
  await showHUD(
    result.onDemandWillReconnect
      ? "⚠ Kill switch on — will reconnect; disable it in the app"
      : "Disconnecting Proton VPN…",
  )
}
