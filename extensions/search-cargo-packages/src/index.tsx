import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
} from '@raycast/api'
import { useState } from 'react'
import fetchPackages from './fetchPackages'
import type { ICreate } from './typings'

export default function PackageList() {
  const [results, setResults] = useState<ICreate[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const handleSearch = async (searchString: string) => {
    setLoading(true)

    const response = await fetchPackages(searchString)

    setResults(response)
    setLoading(false)
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search a package at create.io ...`}
      onSearchTextChange={handleSearch}
      throttle={true}
    >
      {results.map((item: ICreate) => {
        return <PackageItem key={item.name} item={item} />
      })}
    </List>
  )
}

function PackageItem({ item }: { item: ICreate }) {
  return (
    <List.Item
      id={item.name}
      title={item.name}
      subtitle={item.description}
      accessoryTitle={item.version}
      actions={
        <ActionPanel>
          <CopyToClipboardAction
            title="Copy toml Command"
            content={item.installCommand}
          />
          {item.urlDocumentation && (
            <OpenInBrowserAction
              title="Open Documentation"
              url={item.urlDocumentation}
              icon="doc-plaintext-16"
            />
          )}
          <OpenInBrowserAction
            title="Open at crates.io"
            url={item.urlCratesIo}
            icon="link-16"
          />
          {item.urlRepo && (
            <OpenInBrowserAction
              title="Open Repository"
              url={item.urlRepo}
              icon="eye-16"
            />
          )}
        </ActionPanel>
      }
    />
  )
}
