import { RouterOutputs, trpc } from '@/utils/trpc.util'
import { EditBookmark } from '@/views/EditBookmarkForm'
// import { CopyBookmarkToOtherTeam } from '@/views/CopyBookmarkToOtherTeamForm'
import MyAccount from '@/views/MyAccount'
import { Spaces } from '@/views/SpacesView'
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

      {/* 기능 완성되면 다시 추가할 예정 */}
      {/* <Action.Push
        title="Copy URL to Other Team"
        icon="🔗"
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
        target={<CopyBookmarkToOtherTeam bookmark={bookmark} />}
      /> */}

      {/* 기능 완성되면 다시 추가할 예정 */}
      {/* <Action title="Show/hide Detail" icon="ℹ️" onAction={toggleBookmarkDetail} /> */}

      <Action.Push
        title="Edit Bookmark"
        icon="📝"
        shortcut={{ modifiers: ['cmd'], key: 'e' }}
        target={<EditBookmark bookmark={bookmark} refetch={refetch} />}
      />

      {/* 기능 완성되면 다시 추가할 예정 */}
      {/* <Action
        title={'Pin/unpin Bookmark'}
        icon={'📌'}
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
        onAction={() => {
          console.log('pin/unpin')
        }}
      /> */}

      <Action
        title={'Delete Bookmark'}
        icon={'❌'}
        shortcut={{ modifiers: ['ctrl'], key: 'x' }}
        onAction={handleDelete}
      />

      {/* 기능 완성되면 다시 추가할 예정 */}
      {/* <Action
        title={'Reset Ranking'}
        icon=""
        onAction={() => {
          console.log('Reset ranking')
        }}
      /> */}

      <ActionPanel.Section>
        <Action.Push
          title="Add New Bookmark"
          icon="➕"
          target={<AddBookmark onlyPop />}
          onPop={refetch}
          shortcut={{ modifiers: ['cmd'], key: 'n' }}
        />
        <Action.Push title="My Account" icon="👤" target={<MyAccount />} shortcut={{ modifiers: ['cmd'], key: 'm' }} />
        <Action.Push title="Teams" icon="👥" shortcut={{ modifiers: ['cmd'], key: 't' }} target={<Spaces />} />
        {/* 기능 완성되면 다시 추가할 예정 */}
        {/* <Action
          title={'Tags'}
          onAction={() => {
            console.log('label management')
          }}
        />*/}
      </ActionPanel.Section>
    </ActionPanel>
  )
}
