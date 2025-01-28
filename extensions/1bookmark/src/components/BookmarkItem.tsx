import { Icon, List } from '@raycast/api'
import { BookmarkItemActionPanel } from './BookmarkItemActionPanel'
import { RouterOutputs } from '../utils/trpc.util'
import { getFavicon } from '@raycast/utils'
import { useMemo } from 'react'

export const BookmarkItem = (props: {
  bookmark: RouterOutputs['bookmark']['listAll'][number]
  me?: RouterOutputs['user']['me']
  refetch: () => void
}) => {
  const { bookmark, me, refetch } = props
  const { name, url, spaceId } = bookmark
  const space = me?.associatedSpaces.find((s) => s.id === spaceId)

  const icon = useMemo(() => {
    try {
      return getFavicon(url)
    } catch (e) {
      return Icon.Bird
    }
  }, [url])

  return (
    <List.Item
      icon={icon}
      title={name}
      subtitle={url.replace(/^https?:\/\//, '')}
      accessories={space ? [{ icon: space.image || (space.type === 'PERSONAL' ? Icon.Person : Icon.TwoPeople) }] : []}
      actions={
        <BookmarkItemActionPanel bookmark={bookmark} toggleBookmarkDetail={() => {}} me={me} refetch={refetch} />
      }
    />
  )
}
