import { Action, ActionPanel } from '@raycast/api'
import { InviteSpaceMembersForm } from '../views/InviteSpaceMembersForm'

export const SpaceMemberItemActionPanel = (props: { spaceId: string }) => {
  const { spaceId } = props

  // icon은 여기꺼가 더 깔끔한 듯:
  // https://developers.raycast.com/api-reference/user-interface/icons-and-images

  return (
    <ActionPanel>
      <Action
        title={'Show Detail'}
        icon="ℹ️"
        onAction={() => {
          console.log('Show Detail')
        }}
      />
      <Action
        title={'Promote'}
        icon="ℹ️"
        onAction={() => {
          console.log('Promote')
        }}
      />
      <Action
        title={'Remove from This Space'}
        icon="ℹ️"
        onAction={() => {
          console.log('Promote')
        }}
      />
      <ActionPanel.Section>
        <Action.Push
          title={'Invite New Members'}
          shortcut={{ modifiers: ['cmd'], key: 'n' }}
          target={<InviteSpaceMembersForm spaceId={spaceId} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  )
}
