import { closeMainWindow, showHUD } from "@raycast/api"
import { ConnectionState } from "@/types"
import { Message, Error, StorageKeys } from "@/constants"
import { getConnectionNames, getActiveConnections, connect, waitForConnectionState } from "@/api/viscosity"
import { getStorageValue } from "@/api/storage"
import { sort, showErrorHUD } from "@/utils"

export default async function main() {
  await closeMainWindow()
  try {
    const [rawConnections, activeConnections, quickConnect] = await Promise.all([
      getConnectionNames(),
      getActiveConnections(),
      getStorageValue(StorageKeys.QuickConnect),
    ])
    const primaryConnection = sort(rawConnections, quickConnect)[0]

    if (!primaryConnection) {
      await showHUD(Error.HUD.NoConnections)
      return
    }

    const isAlreadyActive = activeConnections.some((c) => c.name === primaryConnection.name)

    if (isAlreadyActive) {
      await showHUD(`✅ "${primaryConnection.name}" ${Message.AlreadyActive}`)
      return
    }

    await showHUD(Message.HUD.Connecting)

    await connect(primaryConnection.name)

    const finalState = await waitForConnectionState(primaryConnection.name, ConnectionState.Connected)

    if (finalState) {
      await showHUD(`${Message.HUD.Connected} to "${primaryConnection.name}"`)
    } else {
      await showHUD(Error.HUD.Generic)
    }
  } catch (e) {
    console.error(e)
    await showErrorHUD(e)
  }
}
