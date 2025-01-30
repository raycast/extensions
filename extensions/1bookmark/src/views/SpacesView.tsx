import { ActionPanel, Action, List, Icon } from '@raycast/api'
import { CachedQueryClientProvider } from '../components/CachedQueryClientProvider'
import { trpc } from '@/utils/trpc.util'
import { NewSpaceForm } from './NewSpaceForm'
import { SpaceItemActionPanel } from '../components/SpaceItemActionPanel'

function Body() {
  const { data, isFetched, refetch } = trpc.user.me.useQuery()
  const associatedSpaces = data?.associatedSpaces

  if (!isFetched || !associatedSpaces) {
    return <List isLoading />
  }

  return (
    <List>
      {associatedSpaces.length < 1 && (
        <List.Item
          title={'Create new Team'}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push title="Select" target={<NewSpaceForm />} onPop={() => refetch()} />
            </ActionPanel>
          }
        />
      )}

      {associatedSpaces.map((s) => (
        <List.Item
          key={s.id}
          title={s.name}
          actions={<SpaceItemActionPanel me={data} spaceId={s.id} refetch={refetch} />}
        />
      ))}
    </List>
  )
}

export function Spaces() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  )
}
