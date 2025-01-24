import { trpc } from '@/utils/trpc.util'
import { Icon, List } from '@raycast/api'
import { CachedQueryClientProvider } from '../components/CachedQueryClientProvider'
import { TeamMemberItemActionPanel } from '../components/TeamMemberItemActionPanel'

export const Body = (props: { spaceId: string }) => {
  const { spaceId } = props
  const { data } = trpc.user.listBySpaceId.useQuery(spaceId)

  return (
    <List>
      {data?.map((m) => (
        <List.Item
          key={m.email}
          title={m.user.name}
          accessories={[{ text: m.status }]}
          icon={Icon.Plus}
          actions={<TeamMemberItemActionPanel spaceId={spaceId} />}
        />
      ))}
    </List>
  )
}

export function TeamMembersView(props: { spaceId: string }) {
  const { spaceId } = props
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  )
}
