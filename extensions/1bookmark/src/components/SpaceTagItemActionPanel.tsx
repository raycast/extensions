import { Action, ActionPanel, confirmAlert } from '@raycast/api'
import { NewTagForm } from '../views/NewTagForm'
import { trpc } from '../utils/trpc.util'

// icon은 여기꺼가 더 깔끔한 듯:
// https://developers.raycast.com/api-reference/user-interface/icons-and-images

export const SpaceTagItemActionPanel = (props: { spaceId: string; tagName: string; refetch: () => void }) => {
  const { spaceId, tagName, refetch } = props

  const deleteTag = trpc.tag.delete.useMutation()

  return (
    <ActionPanel>
      <Action.Push
        title={'Create New Tag'}
        icon="🏷️"
        shortcut={{ modifiers: ['cmd'], key: 'n' }}
        target={<NewTagForm spaceId={spaceId} />}
        onPop={() => refetch()}
      />
      <Action
        title={'Remove Tag'}
        shortcut={{ modifiers: ['ctrl'], key: 'x' }}
        icon="❌️"
        onAction={async () => {
          const confirm = await confirmAlert({
            title: 'Remove Tag',
            message: 'Are you sure you want to remove this tag?',
          })
          if (!confirm) return

          deleteTag.mutateAsync(
            {
              spaceId,
              tagName,
            },
            {
              onSuccess: refetch,
            }
          )
        }}
      />
    </ActionPanel>
  )
}
