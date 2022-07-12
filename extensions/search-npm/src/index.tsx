import { List } from '@raycast/api'
import { useState, useRef } from 'react'
import { fetchPackages } from './utils/fetchPackages'
import { NpmsFetchResponse } from './npmsResponse.model'
import { PackageListItem } from './PackagListItem'

export default function PackageList() {
  const [results, setResults] = useState<NpmsFetchResponse>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const cancelRef = useRef<AbortController | null>(null)

  const onSearchTextChange = async (text: string) => {
    cancelRef.current?.abort()
    cancelRef.current = new AbortController()

    setLoading(true)
    const searchterm = text.replace(/\s/g, '+')
    const response = await fetchPackages(searchterm, cancelRef.current.signal)
    setSearchTerm(searchterm)
    setResults(response)
    setLoading(false)
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search packages, like "promises"…`}
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {results?.length
        ? results.map((result) => {
            return (
              <PackageListItem
                key={result.package.name}
                result={result}
                searchTerm={searchTerm}
              />
            )
          })
        : null}
    </List>
  )
}
