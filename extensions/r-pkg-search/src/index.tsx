import { List } from '@raycast/api'
import { useState } from 'react'
import { fetchPackages } from './utils/fetchPackages'
import { RpkgFetchResponse } from './RpkgResponse.model'
import { PackageListItem } from './PackageListItem'

export default function PackageList() {
  const [results, setResults] = useState<RpkgFetchResponse>([])
  const [loading, setLoading] = useState<boolean>(false)

  const onSearchTextChange = async (text: string) => {
    setLoading(true)
    const response = await fetchPackages(text.replace(/\s/g, '+'))
    setResults(response)
    setLoading(false)
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search packages, like "tidyverse"…`}
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {results?.length
        ? results.map(result => {
            return <PackageListItem key={result.package.name} result={result} />
          })
        : null}
    </List>
  )
}
