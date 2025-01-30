import { ActionPanel, Action, List, Icon } from '@raycast/api'
import { CachedQueryClientProvider } from '../components/CachedQueryClientProvider'
import { trpc } from '@/utils/trpc.util'
import { NewSpaceForm } from './NewSpaceForm'

function Body() {
  const me = trpc.user.me.useQuery()
  const associatedSpaces = me.data?.associatedSpaces

  if (!me.isFetched || !associatedSpaces) {
    return <List isLoading />
  }

  return (
    <List>
      <List.Item
        title={'Create new Team'}
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="Select" target={<NewSpaceForm />} onPop={() => me.refetch()} />
          </ActionPanel>
        }
      />
    </List>
  )
}

export function SpaceDetailView() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  )
}
