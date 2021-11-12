import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from '@raycast/api'
import { useFetch } from './api'
import { Golink } from './types'

export default function ListGolink() {
  const { data, isLoading } = useFetch('/golinks?limit=100')

  const golinks = (data as { results: Golink[] })?.results || []

  return (
    <List isLoading={golinks?.length === 0 || isLoading} searchBarPlaceholder="Filter golinks by name...">
      {golinks.map((l) => {
        return <GolinkListItem key={l.gid} golink={l} />
      })}
    </List>
  )
}

function GolinkListItem(props: { golink: Golink }) {
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
