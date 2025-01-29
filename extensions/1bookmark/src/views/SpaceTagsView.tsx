import { trpc } from '@/utils/trpc.util'
import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { CachedQueryClientProvider } from '../components/CachedQueryClientProvider'
import { SpaceTagItemActionPanel } from '../components/SpaceTagItemActionPanel'
import { NewTagForm } from './NewTagForm'

export const Body = (props: { spaceId: string }) => {
  const { spaceId } = props
  const { data, refetch } = trpc.tag.list.useQuery({ spaceIds: [spaceId] })

  if (data && data.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No tags"
          description="Create a new tag"
          icon="🏷️"
          actions={
            <ActionPanel>
              <Action.Push
                title={'Create New Tag'}
                shortcut={{ modifiers: ['cmd'], key: 'n' }}
                target={<NewTagForm spaceId={spaceId} />}
                onPop={() => refetch()}
              />
            </ActionPanel>
          }
        />
      </List>
    )
  }

  return (
    <List>
      {data?.map((tag) => (
        <List.Item
          key={tag.name}
          title={tag.name}
          icon={tag.space.image || ''}
          actions={<SpaceTagItemActionPanel spaceId={spaceId} tagName={tag.name} refetch={refetch} />}
        />
      ))}
    </List>
  )
}

export function SpaceTagsView(props: { spaceId: string }) {
  const { spaceId } = props
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  )
}
