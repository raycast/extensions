import { Icon, MenuBarExtra, showHUD } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import { connect, disconnect, getStatus, openApp, toggle } from "@kud/protonvpn"

export default function Command() {
  const { data: status, isLoading, revalidate } = useCachedPromise(getStatus)

  const connected = status?.connected ?? false
  const detail = status?.ipv4
    ? `${status.ipv4} · ${status.interface ?? ""}`
    : undefined

  return (
    <MenuBarExtra
      icon={connected ? Icon.Lock : Icon.LockUnlocked}
      title={status?.state}
      isLoading={isLoading}
      tooltip="Proton VPN"
    >
      <MenuBarExtra.Section title={detail}>
        {connected ? (
          <MenuBarExtra.Item
            title="Disconnect"
            icon={Icon.XMarkCircle}
            onAction={async () => {
              const result = await disconnect()
              await showHUD(
                result.onDemandWillReconnect
                  ? "⚠ Kill switch on — will reconnect"
                  : "Disconnecting…",
              )
              revalidate()
            }}
          />
        ) : (
          <MenuBarExtra.Item
            title="Connect"
            icon={Icon.Bolt}
            onAction={async () => {
              await connect()
              await showHUD("Connecting…")
              revalidate()
            }}
          />
        )}
        <MenuBarExtra.Item
          title="Toggle"
          icon={Icon.Repeat}
          onAction={async () => {
            await toggle()
            revalidate()
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {status?.onDemandEnabled ? (
          <MenuBarExtra.Item
            title="Kill switch: on (on-demand)"
            icon={Icon.Shield}
          />
        ) : null}
        <MenuBarExtra.Item
          title="Open Proton VPN"
          icon={Icon.AppWindow}
          onAction={() => openApp()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  )
}
