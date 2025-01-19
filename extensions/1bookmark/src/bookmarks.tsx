import { List, Cache, ActionPanel, Action } from '@raycast/api'
import { CachedQueryClientProvider } from './components/CachedQueryClientProvider'
import { RouterOutputs, trpc } from '@/utils/trpc.util'
import { Onboarding } from './components/Onboarding'
import { useAtom } from 'jotai'
import { showBookmarkDetailAtom } from '@/states/bookmark-view'
import { useEffect, useState } from 'react'
import { sessionTokenAtom } from '@/states/session-token.state'
import { Teams } from './views/TeamsView'
import AddBookmark from './add-bookmark'
import { BookmarkItem } from './components/BookmarkItem'
import { Bookmark } from './types'
import { BookmarkFilter } from './components/BookmarkFilter'

const cache = new Cache()
const cachedBookmarks = cache.get('bookmarks')
const cachedMe = cache.get('me')

export function Body() {
  const [sessionToken, setSessionToken] = useAtom(sessionTokenAtom)

  const me = trpc.user.me.useQuery(undefined, {
    queryHash: sessionToken,
    enabled: !!sessionToken,
    initialData: cachedMe
      ? () => {
          const initialData: RouterOutputs['user']['me'] = JSON.parse(cachedMe)
          return initialData
        }
      : undefined,
  })

  const spaceIds = me?.data?.associatedSpaces.map((s) => s.id) || []

  const { data, isFetching, isFetched, refetch } = trpc.bookmark.listAll.useQuery(
    {
      spaceIds,
    },
    {
      enabled: me.data && me.isFetched,
      initialData: cachedBookmarks
        ? () => {
            // TODO: 호환성 검사 후 리턴해야함.
            // 아니면 스키마 버전마다 key를 바꾸는 방법도 있을 듯.
            const initialData: Bookmark[] = JSON.parse(cachedBookmarks)
            return initialData
          }
        : undefined,
    }
  )

  const [, setShowBookmarkDetail] = useAtom(showBookmarkDetailAtom)
  const toggleBookmarkDetail = () => setShowBookmarkDetail((prev) => !prev)
  const [after1Sec, setAfter1Sec] = useState(false)

  useEffect(() => {
    if (!data) return

    cache.set('bookmarks', JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (!me.data) return

    cache.set('me', JSON.stringify(me.data))
  }, [me.data])

  useEffect(() => {
    // 이게 없으면 아주 잠깐동안 Onboarding이 보이게됨.
    setTimeout(() => setAfter1Sec(true), 1000)
  }, [])

  useEffect(() => {
    if (!me.error) return

    // 토큰 만료등으로 로그인에 실패한 것.
    // sessionToken을 클리어 시키고 Onboarding으로 보낸다.
    console.log('🚀 ~ session clear')
    setSessionToken('')
  }, [me.error, setSessionToken])

  if (!sessionToken && after1Sec) {
    return <Onboarding />
  }

  if (!data) {
    return <List isLoading={true} />
  }

  if (isFetched && data.length === 0) {
    return (
      <List isLoading={isFetching || !me.data}>
        <List.Item
          title="No bookmark. Add a bookmark to get started"
          icon={'➕'}
          actions={
            <ActionPanel>
              <Action.Push title="Add New Bookmark" target={<AddBookmark onlyPop />} onPop={refetch} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Teams"
          icon={'👥'}
          actions={
            <ActionPanel>
              <Action.Push title="Teams" target={<Teams />} />
            </ActionPanel>
          }
        />
      </List>
    )
  }

  return (
    <List isLoading={isFetching || !me.data} searchBarAccessory={<BookmarkFilter me={me.data} />}>
      {data.map((item) => (
        <BookmarkItem key={item.id} bookmark={item} me={me.data} refetch={refetch} />
      ))}
    </List>
  )
}

export default function Bookmarks() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  )
}
