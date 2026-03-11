import { Action, ActionPanel, Icon, List, showToast, Toast } from '@raycast/api'
import { useGoLinks } from './api'
import { GoLink } from './types'

export default function ListGoLinks() {
  const { data, isLoading, error } = useGoLinks()

  if (error) {
    showToast({ style: Toast.Style.Failure, title: 'Error occurred', message: error.message })
  }

  const golinks = data || []

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter GoLinks by name...">
      {golinks.map((l) => (
        <GoLinkListItem key={l.Short} golink={l} />
      ))}
    </List>
  )
}

function GoLinkListItem(props: { golink: GoLink }) {
  const golink = props.golink

  return (
    <List.Item
      id={golink.Short}
      title={golink.Short}
      subtitle={golink.Long}
      icon="list-icon.png"
      accessories={[{ text: golink.Owner, icon: Icon.Person }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Go Link" url={`http://go/${golink.Short}`} />
          <Action.OpenInBrowser title="Open Target URL" url={golink.Long} />
          <Action.CopyToClipboard title="Copy Go Link" content={`go/${golink.Short}`} />
          <Action.CopyToClipboard title="Copy Target URL" content={golink.Long} />
        </ActionPanel>
      }
    />
  )
}
