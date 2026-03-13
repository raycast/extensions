import { List, getPreferenceValues } from '@raycast/api'
import { LinkItem } from './components/LinkItem'
import { useRecents } from './useRecents'
import { TagDropdown } from './components/TagDropdown'
import { useMeta } from './useMeta'
import { useState } from 'react'
import { NoItems } from './components/NoItems'
import { RecentTop } from './components/RecentTop'
import { DEFAULT_TAG } from './constants'
import { Authenticated } from './components/Authenticated'

const prefs = getPreferenceValues()

export const RecentBookmarks = () => {
  const [activeTag, setActiveTag] = useState<string>(DEFAULT_TAG)
  const { data: recentBookmarks, isLoading } = useRecents(activeTag)
  const { data: metadata } = useMeta()

  const handleReset = () => {
    setActiveTag(DEFAULT_TAG)
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter…"
      isShowingDetail={prefs.showDetailView}
      searchBarAccessory={
        <TagDropdown tags={metadata?.tags} onChange={setActiveTag} />
      }
    >
      <RecentTop activeTag={activeTag} />
      {recentBookmarks?.length ? (
        recentBookmarks.map((item) => {
          return <LinkItem key={`recent-${item.id}`} {...item} />
        })
      ) : (
        <NoItems onReset={handleReset} />
      )}
    </List>
  )
}

export default function Command() {
  return (
    <Authenticated>
      <RecentBookmarks />
    </Authenticated>
  )
}
