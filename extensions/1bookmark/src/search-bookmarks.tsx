import { List, Cache, ActionPanel, Action } from '@raycast/api'
import { CachedQueryClientProvider } from './components/CachedQueryClientProvider'
import { trpc } from '@/utils/trpc.util'
import { useAtom } from 'jotai'
import { showBookmarkDetailAtom } from '@/states/bookmark-view'
import { useEffect, useMemo, useState } from 'react'
import { sessionTokenAtom } from '@/states/session-token.state'
import { Spaces } from './views/SpacesView'
import AddBookmark from './add-bookmark'
import { BookmarkItem } from './components/BookmarkItem'
import { BookmarkFilter } from './components/BookmarkFilter'
import { LoginView } from './views/LoginView'
import { useMe } from './hooks/use-me.hook'
import { useBookmarks } from './hooks/use-bookmarks.hook'
import { Bookmark } from './types'
import { useBookmarkSearchs } from './hooks/use-bookmark-searchs.hook'

const cache = new Cache()

export function Body() {
  const [sessionToken, setSessionToken] = useAtom(sessionTokenAtom)
  const trpcUtils = trpc.useUtils()
  const me = useMe(sessionToken)

  const spaceIds = useMemo(() => {
    return me?.data?.associatedSpaces.map((s) => s.id) || []
  }, [me.data])

  const { data, isFetching, isFetched, refetch } = useBookmarks({
    sessionToken,
    spaceIds,
    me: me.data,
  })

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

  useEffect(() => {
    // 로그아웃 시 기존 데이터 제거
    // if (!after1Sec) return // 이게 없으면 첫 진입시 실행됨.
    if (sessionToken) return
    if (!me.data && !data) return
    if (!after1Sec) return

    console.log('🚀 ~ detect logout')
    trpcUtils.user.me.reset()
    trpcUtils.bookmark.listAll.reset({ spaceIds })

    setAfter1Sec(false)
    setTimeout(() => setAfter1Sec(true), 1000)

    cache.remove('me')
    cache.remove('bookmarks')
  }, [sessionToken, trpcUtils, spaceIds, me.data, data, after1Sec])

  useEffect(() => {
    // 로그아웃 상태에서 다시 로그인 했을 때,
    if (!sessionToken) return
    if (me.data && data) return

    // refetch()
  }, [sessionToken, me.data, data, refetch])

  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    console.log('keyword: ' + keyword)
  }, [keyword])

  const selectedTags = useMemo(() => {
    if (!me.data) return []

    return me.data.associatedSpaces.flatMap((space) => {
      return space.myTags.map((tag) => `${space.id}:${tag}`)
    })
  }, [me.data])

  const { searchInTags, searchInUntagged, taggedBookmarks, untaggedBookmarks } = useBookmarkSearchs({
    data,
    selectedTags,
  })

  const { filteredTaggedList, filteredUntaggedList } = useMemo(() => {
    if (!searchInTags || !searchInUntagged || keyword === '') {
      return {
        filteredTaggedList: taggedBookmarks,
        filteredUntaggedList: untaggedBookmarks,
      }
    }

    return {
      filteredTaggedList: searchInTags.search(keyword, { prefix: true, combineWith: 'AND' }) as unknown as Bookmark[],
      filteredUntaggedList: searchInUntagged.search(keyword, {
        prefix: true,
        combineWith: 'AND',
      }) as unknown as Bookmark[],
    }
  }, [searchInTags, searchInUntagged, keyword, taggedBookmarks, untaggedBookmarks])

  if (!sessionToken && after1Sec) {
    return <LoginView />
  }

  if (!data || !filteredTaggedList || !filteredUntaggedList) {
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
          title="Spaces"
          icon={'👥'}
          actions={
            <ActionPanel>
              <Action.Push title="Spaces" target={<Spaces />} />
            </ActionPanel>
          }
        />
      </List>
    )
  }

  return (
    <List
      isLoading={isFetching || !me.data}
      searchBarAccessory={me.data && <BookmarkFilter spaceIds={spaceIds} me={me.data} />}
      searchText={keyword}
      onSearchTextChange={setKeyword}
    >
      <List.Section
        title={`${filteredTaggedList.length} tagged out of ${filteredTaggedList.length + filteredUntaggedList.length} results`}
      >
        {filteredTaggedList.map((item) => (
          <BookmarkItem key={item.id} bookmark={item} me={me.data} refetch={refetch} />
        ))}
      </List.Section>
      <List.Section
        title={`${filteredUntaggedList.length} untagged out of ${filteredTaggedList.length + filteredUntaggedList.length} results`}
      >
        {filteredUntaggedList.map((item) => (
          <BookmarkItem key={item.id} bookmark={item} me={me.data} refetch={refetch} />
        ))}
      </List.Section>
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
