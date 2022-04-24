import bytes from 'bytes'
import dayjs from 'dayjs'
import actionBoundary from '../utils/actionBoundary'
import useRequire from '../hooks/useRequire'
import ErrorBoundary from './ErrorBoundary'
import { Action, ActionPanel, Form, List, useNavigation } from '@raycast/api'
import { useEffect, useState } from 'react'
import { getDevices, setDevices } from '../api'
import { getCurrentBackend } from '../utils'
import { DevicesT } from '../utils/types'

const Devices = () => {
  const { pop } = useNavigation()
  const [currentUrl, setCurrentUrl] = useState('')

  const {
    response: devicesList,
    error,
    loading,
    run,
  } = useRequire<DevicesT>({
    apiLoader: getDevices,
    defaultData: [],
    refetchInterval: 2000,
  })

  useEffect(() => {
    ;(async () => {
      const { url } = await getCurrentBackend()
      setCurrentUrl(url)
    })()
  }, [])

  const onActionHandle = actionBoundary(async (data, physicalAddress: string) => {
    await setDevices({ physicalAddress, ...data })
    await run()
    pop()
  })

  return (
    <List isLoading={loading} isShowingDetail navigationTitle="Devices">
      <ErrorBoundary error={error}>
        {devicesList.map((device) => {
          const content = `
# ${device.name}
${device.sourceIP} ${device.dhcpAssignedIP ? `(Assigned IP: ${device.dhcpAssignedIP})` : ''}
        
### Bandwidth:

> ↑ ${bytes(device.currentOutSpeed)}/s | ↓ ${bytes(device.currentInSpeed)}/s

### Connections

> Active: ${device.activeConnections} | Total Since Launch: ${device.totalConnections}

### Detail
- Takeover Mode: 
${device.dhcpGatewayEnabled ? (device.hasProxyConnection ? 'Proxy & Gateway' : 'Gateway') : 'None'}
${device.dhcpHostname ? '- DHCP Hostname: ' + device.dhcpHostname : ''}
${
  device.dhcpLastSeenTimestamp
    ? `- Last Seen: ${dayjs.unix(device.dhcpLastSeenTimestamp).format('L LTS')}`
    : ''
}
${device.dhcpAssignedIP ? `- Fixed IP Address: ${device.dhcpAssignedIP}` : ''}
${device.physicalAddress ? '- MAC Address: ' + device.physicalAddress : ''}
- Manufacturer: ${device.vendor}

${
  device.inBytesStat && device.outBytesStat
    ? `
### Traffic
- Today: ↑ ${bytes(device.outBytesStat.today)}  |  ↓ ${bytes(device.inBytesStat.today)}
- Last 5 minutes: ↑ ${bytes(device.outBytesStat.m5)}  |  ↓ ${bytes(device.inBytesStat.m5)}
- Last 15 minutes: ↑ ${bytes(device.outBytesStat.m15)}  |  ↓ ${bytes(device.inBytesStat.m15)}
- Last 60 minutes: ↑ ${bytes(device.outBytesStat.m60)}  |  ↓ ${bytes(device.inBytesStat.m60)}
- Last 6 hours: ↑ ${bytes(device.outBytesStat.h6)}  |  ↓ ${bytes(device.inBytesStat.h6)}
- Last 12 hours: ↑ ${bytes(device.outBytesStat.h12)}  |  ↓ ${bytes(device.inBytesStat.h12)}
- Last 24 hours: ↑ ${bytes(device.outBytesStat.h24)}  |  ↓ ${bytes(device.inBytesStat.h24)}
`
    : ''
}
`

          return (
            <List.Item
              key={device.physicalAddress}
              title={device.name}
              accessoryTitle={device.dhcpWaitingToReconnect ? 'Waiting' : ''}
              icon={{
                source: `${currentUrl}/resources/devices-icon?id=${encodeURIComponent(device.dhcpIcon)}`,
              }}
              detail={<List.Item.Detail markdown={content} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Device Settings"
                    target={
                      <Form
                        actions={
                          <ActionPanel>
                            <Action.SubmitForm
                              title="Submit"
                              onSubmit={(data) => onActionHandle(data, device.physicalAddress)}
                            />
                          </ActionPanel>
                        }
                      >
                        <Form.TextField id="name" title="name" defaultValue={device.name} />
                        <Form.TextField
                          id="address"
                          title="address"
                          defaultValue={device.dhcpAssignedIP || ''}
                        />
                        <Form.Checkbox
                          id="shouldHandledBySurge"
                          label="Handled by Surge"
                          defaultValue={!!device.dhcpGatewayEnabled}
                        />
                      </Form>
                    }
                  />
                </ActionPanel>
              }
            />
          )
        })}
      </ErrorBoundary>
    </List>
  )
}

export default Devices
