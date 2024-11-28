import {
  List,
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
} from '@raycast/api'
import urlJoin from 'proper-url-join'

const prefs = getPreferenceValues()

type RecentTopProps = {
  activeTag: string
}
export const RecentTop = ({ activeTag }: RecentTopProps) => {
  const isAll = activeTag === 'all'
  const isUntagged = activeTag === 'Untagged'
  const isNotActive = isAll || isUntagged
  return (
    <List.Item
      title={
        isAll
          ? `Open recent items in Otter`
          : isUntagged
            ? `Open untagged items in Otter`
            : `Open "${activeTag}" in Otter`
      }
      icon={isNotActive ? Icon.Eye : Icon.Hashtag}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={
              isAll
                ? urlJoin(prefs.otterBasePath, 'feed')
                : urlJoin(prefs.otterBasePath, 'tag', activeTag)
            }
            title={`Open "${activeTag}" in Otter`}
          />
        </ActionPanel>
      }
    />
  )
}
