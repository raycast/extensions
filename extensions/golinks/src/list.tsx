import { ActionPanel, CopyToClipboardAction, Icon, List, OpenInBrowserAction } from '@raycast/api'
import { useFetch } from './api'
import { GoLink } from './types'

export default function ListGoLink() {
  const { data, isLoading, error } = useFetch('/golinks?limit=100')
  if (error) {
    return (
      <List>
        <List.Item icon={Icon.ExclamationMark} title="Error occurred" accessoryTitle={error.message} />
      </List>
    )
  }

  const golinks = (data as { results: GoLink[] })?.results || []

  return (
    <List isLoading={golinks?.length === 0 || isLoading} searchBarPlaceholder="Filter GoLinks by name...">
      {golinks.map((l) => {
        return <GoLinkListItem key={l.gid} golink={l} />
      })}
    </List>
  )
}

function GoLinkListItem(props: { golink: GoLink }) {
  const golink = props.golink

  return (
    <List.Item
      id={golink.gid.toString()}
      key={golink.gid.toString()}
      title={golink.name}
      icon="list-icon.png"
      accessoryTitle={golink.url}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={golink.url} />
          <CopyToClipboardAction title="Copy URL" content={`https://app.golinks.io/${golink.name}`} />
        </ActionPanel>
      }
    />
  )
}
