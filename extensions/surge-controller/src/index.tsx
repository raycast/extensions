import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { useEffect, useState } from 'react'
import {
  getBackends,
  getCurrentBackendName,
  checkBackendStatus,
  setCurrentBackendName,
  getCurrentBackendVersion,
  checkSystemIsIOS,
} from './utils'
import { BackendsT, VersionT } from './utils/types'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import Backends from './components/Backends'
import Components from './components'
import ErrorBoundary from './components/ErrorBoundary'
import dayjs from 'dayjs'

dayjs.extend(localizedFormat)

type ComponentT = {
  title?: string
  icon?: string
  macOnly?: boolean
  component: JSX.Element
}

let errTitle: string
let errInfo: string
const commponents: Array<ComponentT> = [
  {
    component: <Components.OutboundMode key="OutboundMode" />,
  },
  {
    title: 'Policies',
    icon: Icon.Globe,
    component: <Components.Policies />,
  },
  {
    title: 'Events',
    icon: Icon.Text,
    component: <Components.Events />,
  },
  {
    title: 'Statistics',
    icon: Icon.List,
    component: <Components.Statistics />,
  },
  {
    title: 'Requests',
    icon: Icon.Upload,
    component: <Components.Requests />,
  },
  {
    title: 'Capabilities',
    icon: Icon.Hammer,
    component: <Components.Capabilities />,
  },
  {
    title: 'Modules',
    icon: Icon.MemoryChip,
    component: <Components.Modules />,
  },
  {
    title: 'DNS',
    icon: Icon.Binoculars,
    component: <Components.DNS />,
  },
  {
    title: 'Devices',
    icon: Icon.Desktop,
    component: <Components.Devices />,
    macOnly: true,
  },
  {
    component: <Components.Profiles key="SwitchProfile" />,
  },
]

const Command = () => {
  const [backends, setBackends] = useState<BackendsT>({} as BackendsT)
  const [current, setCurrent] = useState('')
  const [version, setVersion] = useState<VersionT>({} as VersionT)
  const [isIOS, setIsIOS] = useState(true)
  const [status, setStatus] = useState(false)
  const [loading, setloading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const currentBackendName = await getCurrentBackendName()

      currentBackendName && setCurrent(currentBackendName)

      const items = await getBackends()
      setBackends(items)
    })()
  }, [])

  useEffect(() => {
    setloading(true)
    setStatus(false)
    ;(async () => {
      const [status, title, info] = await checkBackendStatus()
      if (status) {
        const version = await getCurrentBackendVersion()
        const isIOS = await checkSystemIsIOS()
        setIsIOS(isIOS)
        setVersion(version)
      }
      errTitle = title
      errInfo = info
      setStatus(status)
      setloading(false)
    })()
  }, [current])

  const onBackendChange = async (name: string) => {
    await setCurrentBackendName(name)
    setCurrent(name)
  }

  const backendsAction = (
    <ActionPanel>
      <Action.Push
        title="Show Backends"
        target={
          <Backends
            backends={backends}
            setBackends={setBackends}
            current={current}
            onBackendChange={onBackendChange}
          />
        }
      />
    </ActionPanel>
  )

  const backendList = Object.entries(backends)

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Backends" value={current} onChange={onBackendChange}>
          {backendList.map(([name]) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      <ErrorBoundary error={!status} title={errTitle} info={errInfo} actions={backendsAction}>
        <List.Section title={version.deviceName} subtitle={version.version}>
          {commponents.map(({ title, icon, component, macOnly }) =>
            title
              ? !(macOnly && isIOS) && (
                  <List.Item
                    title={title}
                    key={title}
                    icon={icon}
                    actions={
                      <ActionPanel>
                        <Action.Push title={`Show ${title}`} target={component} />
                      </ActionPanel>
                    }
                  />
                )
              : component,
          )}
          <List.Item
            title="Backends"
            icon={Icon.Gear}
            key="Backends"
            subtitle={current}
            actions={backendsAction}
          />
        </List.Section>
      </ErrorBoundary>
    </List>
  )
}

export default Command
