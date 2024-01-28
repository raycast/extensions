import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from '@raycast/api'
import { Item } from './Item'
import urlJoin from 'proper-url-join'
import { useAuth } from './use-auth'
import { useRecents } from './useRecents'
import { Unauthorised } from './unauthorised'

export default function Recent() {
  const authError = useAuth()
  const { bookmarks, isLoading } = useRecents()
  const prefs = getPreferenceValues()

  if (authError) {
    return <Unauthorised authError={authError} />
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter…">
      <List.Item
        title={`View recent items in Otter`}
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url={urlJoin(prefs.otterBasePath, 'feed')}
              title="Open recent items in Otter"
            />
          </ActionPanel>
        }
      />
      {bookmarks?.length
        ? bookmarks.map((item) => {
            return <Item key={item.id} {...item} />
          })
        : null}
    </List>
  )
}
