import { List } from '@raycast/api'
import { useState } from 'react'
import { useFetch } from '@raycast/utils'
import { PackageListItem } from './PackagListItem'
import { NpmSearchFetchResponse } from './npmResponse.model'

export default function PackageList() {
  const [searchTerm, setSearchTerm] = useState('')
  const { isLoading, data } = useFetch<NpmSearchFetchResponse>(
    `https://registry.npmjs.org/-/v1/search?text=${searchTerm.replace(
      /\s/g,
      '+',
    )}`,
    { execute: searchTerm.trim() !== '' },
  )

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search packages, like "promises"…`}
      onSearchTextChange={setSearchTerm}
      throttle
    >
      {data?.objects
        ? data.objects.map((result) => {
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
