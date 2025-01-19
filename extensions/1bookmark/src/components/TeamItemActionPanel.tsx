import { RouterOutputs, trpc } from '@/utils/trpc.util'
import { Action, ActionPanel, Alert, confirmAlert } from '@raycast/api'
import { TeamMembersView } from '../views/TeamMembersView'
import { NewTeamForm } from '../views/NewTeamForm'

export const TeamItemActionPanel = (props: {
  me: RouterOutputs['user']['me'] | undefined
  refetch: () => void
  spaceId: string
}) => {
  const { spaceId, refetch } = props

  const handleDelete = async () => {}

  return (
    <ActionPanel>
      <Action
        title="Open Team Detail"
        onAction={() => {
          console.log('Open Team Detail')
        }}
      />
      <Action.Push
        title={'Members'}
        shortcut={{ modifiers: ['cmd'], key: 'm' }}
        target={<TeamMembersView spaceId={spaceId} />}
      />
      <Action title={'Parts'} onAction={() => console.log('Parts')} />
      <Action title={'Copy Invitation Link'} onAction={() => console.log('Copy invitation link')} />
      <Action title={'Leave Team'} onAction={() => console.log('Leave Team')} />
      <Action title={'Delete Team'} onAction={() => console.log('Delete team')} />
      <ActionPanel.Section>
        <Action.Push
          title={'Add New Team'}
          target={<NewTeamForm />}
          shortcut={{ modifiers: ['cmd'], key: 'n' }}
          onPop={refetch}
        />
      </ActionPanel.Section>
    </ActionPanel>
  )
}
