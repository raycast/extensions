import { ActionPanel, Action, List, Icon } from '@raycast/api'
import { CachedQueryClientProvider } from '../components/CachedQueryClientProvider'
import { trpc } from '@/utils/trpc.util'
import { NewTeamForm } from './NewTeamForm'
import { TeamItemActionPanel } from '../components/TeamItemActionPanel'

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
              <Action.Push title="Select" target={<NewTeamForm />} onPop={() => refetch()} />
            </ActionPanel>
          }
        />
      )}

      {associatedSpaces.map((s) => (
        <List.Item
          key={s.id}
          title={s.name}
          actions={<TeamItemActionPanel me={data} spaceId={s.id} refetch={refetch} />}
        />
      ))}
    </List>
  )
}

export function Teams() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  )
}
