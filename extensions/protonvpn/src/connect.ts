import { showHUD } from "@raycast/api"
import { connect, getStatus } from "@kud/protonvpn"

export default async function Command() {
  const status = await getStatus()
  if (status.connected) {
    await showHUD("Proton VPN already connected")
    return
  }
  await connect()
  await showHUD("⚡ Connecting Proton VPN…")
}
