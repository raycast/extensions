import { showHUD } from "@raycast/api"
import { openApp } from "@kud/protonvpn"

export default async function Command() {
  await openApp()
  await showHUD("Opened Proton VPN")
}
