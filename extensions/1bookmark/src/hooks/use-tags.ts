import { RouterOutputs } from '@repo/trpc-router'
import { trpc } from '../utils/trpc.util'

type Tag = {
  name: string
  // icon: string
  space: {
    id: string
    name: string
    image: string
  }
}

export const useTags = (props: {
  me?: RouterOutputs['user']['me']
  bookmarks?: RouterOutputs['bookmark']['listAll']
}) => {
  const { me, bookmarks } = props
  const tags = trpc.tag.list.useQuery({
    spaceIds: me?.associatedSpaces.map((s) => s.id) || [],
  })
  // const tags: Tag[] = useMemo(() => {
  //   const spaces = me?.associatedSpaces || []
  //   if (!me) return []
  //   if (!bookmarks) return []

  //   return bookmarks.flatMap(b => {
  //     return b.tags.map(t => {
  //       const [name] = t.split(':') as [string, string]
  //       return {
  //         name,
  //         // icon은 나중에 추가해볼것.
  //         space: {
  //           id: b.spaceId,
  //           name: spaces.find(s => s.id === b.spaceId)?.name || 'unknown',
  //           image: spaces.find(s => s.id === b.spaceId)?.image || 'unknown',
  //         }
  //       }
  //     })
  //   })
  // }, [me, bookmarks])

  return tags
}
