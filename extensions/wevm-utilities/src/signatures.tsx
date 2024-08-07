import { Action, ActionPanel, type LaunchProps, List } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { useMemo, useState } from 'react'

type Data = {
  functions: { selector: string; signature: string }[]
  events: { selector: string; signature: string }[]
}

export default function Command(parameters: LaunchProps<{ arguments: { value: string } }>) {
  const { value } = parameters.arguments

  const [searchText, setSearchText] = useState(value)

  const { isLoading, data } = useFetch<Data>(`https://api.wevm.dev/sigs?searchText=${searchText}`, {
    keepPreviousData: true,
  })

  const excludeFunctions = useMemo(() => searchText.includes('event'), [searchText])
  const excludeEvents = useMemo(() => searchText.includes('function'), [searchText])

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      <List.Section title="Functions">
        {!excludeFunctions &&
          data?.functions.map((item) => (
            <ListItem key={item.selector} item={item} searchText={searchText} />
          ))}
      </List.Section>
      <List.Section title="Events">
        {!excludeEvents &&
          data?.events.map((item) => (
            <ListItem key={item.selector} item={item} searchText={searchText} />
          ))}
      </List.Section>
    </List>
  )
}

function ListItem({
  item,
  searchText,
}: { item: { selector: string; signature: string }; searchText: string }) {
  return (
    <List.Item
      key={item.selector}
      title={searchText.startsWith('0x') ? item.signature : item.selector}
      accessories={[{ text: searchText.startsWith('0x') ? item.selector : item.signature }]}
      actions={
        <ActionPanel>
          {searchText.startsWith('0x') ? (
            <Action.CopyToClipboard title="Copy Signature (Name)" content={item.signature} />
          ) : (
            <Action.CopyToClipboard title="Copy Selector (Hex Value)" content={item.selector} />
          )}
          {searchText.startsWith('0x') ? (
            <Action.CopyToClipboard title="Copy Selector (Hex Value)" content={item.selector} />
          ) : (
            <Action.CopyToClipboard title="Copy Signature (Name)" content={item.signature} />
          )}
        </ActionPanel>
      }
    />
  )
}
