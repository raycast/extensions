import { List } from '@raycast/api'
import { useApps } from './hooks/useApps'
import { useDiskSpace } from './hooks/useDiskSpace'

export default function Command() {
  const { data: apps, loading: appsLoading } = useApps()

  const { data: diskSpace, loading: diskSpaceLoading } = useDiskSpace()

  return (
    <List isLoading={appsLoading || diskSpaceLoading}>
      <List.Section title={'Disk'}>
        {diskSpace && <List.Item title={diskSpace} />}
      </List.Section>
      <List.Section title={'Apps'}>
        {apps?.map((app) => (
          <List.Item
            key={app.name}
            title={app.name}
            subtitle={app.size}
            icon={{
              source: app.iconPath,
            }}
          />
        ))}
      </List.Section>
    </List>
  )
}
