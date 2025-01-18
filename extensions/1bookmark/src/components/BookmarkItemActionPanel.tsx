import { RouterOutputs, trpc } from '@/utils/trpc.util'
import { EditBookmark } from '@/views/EditBookmarkForm'
import { CopyBookmarkToOtherTeam } from '@/views/CopyBookmarkToOtherTeamForm'
import MyAccount from '@/views/MyAccount'
import { Teams } from '@/views/TeamsView'
import { Action, ActionPanel, Alert, confirmAlert } from '@raycast/api'
import AddBookmark from '../add-bookmark'

export const BookmarkItemActionPanel = (props: {
  bookmark: RouterOutputs['bookmark']['listAll'][number]
  me: RouterOutputs['user']['me'] | undefined
  toggleBookmarkDetail: () => void
  refetch: () => void
}) => {
  const { bookmark, toggleBookmarkDetail, me, refetch } = props
  const { url } = bookmark

  const spaceIds = me?.associatedSpaces.map((s) => s.id) || []
  const deleteBookmark = trpc.bookmark.delete.useMutation()
  const utils = trpc.useUtils()

  // icon은 여기꺼가 더 깔끔한 듯:
  // https://developers.raycast.com/api-reference/user-interface/icons-and-images

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: 'Delete Bookmark?',
      primaryAction: {
        title: 'Delete',
        style: Alert.ActionStyle.Destructive,
      },
    })
    if (!confirmed) return

    await deleteBookmark.mutateAsync(bookmark.id)
    utils.bookmark.listAll.setData({ spaceIds }, (prev) => {
      if (!prev) return prev

      return prev.filter((b) => b.id !== bookmark.id)
    })
    utils.bookmark.listAll.refetch({ spaceIds })
  }

  const createActivity = trpc.activity.create.useMutation()

  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open URL"
        url={url}
        onOpen={() => {
          createActivity.mutate({
            type: 'BOOKMARK_OPEN',
            spaceId: bookmark.spaceId,
            data: { bookmarkId: bookmark.id },
          })
        }}
      />
      <Action.CopyToClipboard
        title="Copy URL to Clipboard"
        content={url}
        shortcut={{ modifiers: ['cmd'], key: 'c' }}
        onCopy={() => {
          createActivity.mutate({
            type: 'BOOKMARK_COPY',
            spaceId: bookmark.spaceId,
            data: { bookmarkId: bookmark.id },
          })
        }}
      />
      <Action.Push
        title="Copy URL to Other Team"
        icon="🔗"
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
        target={<CopyBookmarkToOtherTeam bookmark={bookmark} />}
      />
      <Action title="Show/hide Detail" icon="ℹ️" onAction={toggleBookmarkDetail} />
      <Action.Push
        title="Edit Bookmark"
        icon="📝"
        shortcut={{ modifiers: ['cmd'], key: 'e' }}
        target={<EditBookmark bookmark={bookmark} />}
      />
      <Action
        title={'Pin/unpin Bookmark'}
        icon={'📌'}
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
        onAction={() => {
          console.log('pin/unpin')
        }}
      />
      <Action
        title={'Delete Bookmark'}
        icon={'❌'}
        shortcut={{ modifiers: ['ctrl'], key: 'x' }}
        onAction={handleDelete}
      />
      <Action
        title={'Reset Ranking'}
        icon=""
        onAction={() => {
          console.log('Reset ranking')
        }}
      />
      <ActionPanel.Section>
        <Action.Push title="Add New Bookmark" target={<AddBookmark onlyPop />} onPop={refetch} />
        <Action.Push title="My Account" icon="👤" target={<MyAccount />} />
        <Action.Push title="Teams" icon="👥" shortcut={{ modifiers: ['cmd'], key: 't' }} target={<Teams />} />
        <Action
          title={'Label Management'}
          onAction={() => {
            console.log('label management')
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  )
}
