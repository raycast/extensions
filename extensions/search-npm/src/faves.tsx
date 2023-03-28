import { List } from '@raycast/api'
import { useState, useEffect } from 'react'
import { PackageListItem } from './PackagListItem'
import type { Package } from './npmResponse.model'
import { getFaves } from './utils/favorite-storage'

export default function PackageList() {
  const [faves, setFaves] = useState<Package[]>([])

  useEffect(() => {
    async function fetchFaves() {
      const faveItems = await getFaves()
      setFaves(faveItems)
    }
    fetchFaves()
  }, [])

  const handleFaveChange = async () => {
    const faveItems = await getFaves()
    setFaves(faveItems)
  }

  return (
    <List searchBarPlaceholder="Filter your favorite packages…">
      {faves?.length ? (
        <List.Section title="Favorites" subtitle={faves.length.toString()}>
          {faves.map((result) => {
            return (
              <PackageListItem
                key={result.name}
                result={result}
                isFaved={
                  faves.findIndex((item) => item.name === result.name) !== -1
                }
                handleFaveChange={handleFaveChange}
                isInFaveList
              />
            )
          })}
        </List.Section>
      ) : null}
    </List>
  )
}
