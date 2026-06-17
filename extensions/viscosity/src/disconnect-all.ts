import { showHUD, closeMainWindow } from "@raycast/api"
import { Message } from "@/constants"
import { getActiveConnections, disconnectAll, waitForAllDisconnected } from "@/api/viscosity"
import { showErrorHUD } from "@/utils"

export default async function main() {
  await closeMainWindow()
  try {
    const activeConnections = await getActiveConnections()

    if (activeConnections.length === 0) {
      await showHUD(Message.HUD.NoActiveConnections)
      return
    }

    await showHUD(Message.HUD.Disconnecting)

    await disconnectAll()

    const finalState = await waitForAllDisconnected()

    if (finalState) {
      await showHUD(Message.HUD.Disconnected)
    }
  } catch (e) {
    console.error(e)
    await showErrorHUD(e)
  }
}
