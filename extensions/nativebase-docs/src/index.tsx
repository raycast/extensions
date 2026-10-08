import { Action, ActionPanel, Detail, List, LocalStorage } from '@raycast/api'
import fetch from 'node-fetch'
import React, { useEffect } from 'react'
import { Docs } from './components'
import { timeCheck } from './services/timecheck'
import { ContentResponse } from './types'

export default function main() {
  const [versions, setVersions] = React.useState<string[]>([])
  const [error, setError] = React.useState<Error | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)

  useEffect(() => {
    getVersions()
  }, [])

  const getVersions = async () => {
    try {
      const cachedVersions = await LocalStorage.getItem('nb-docs:versions')
      if ((await timeCheck()) && cachedVersions) {
        setVersions(await JSON.parse(cachedVersions as string))
        setLoading(false)
        return
      }
      const res = await fetch(
        'https://api.github.com/repos/GeekyAnts/nativebase-docs/contents/docs'
      )

      if (res.status !== 200) {
        const err = (await res.json()) as Error
        setError(err)
        setLoading(false)
        return
      }

      const data = (await res.json()) as Array<ContentResponse>
      data.reverse()
      const mappedVersions = data?.map((d) => d?.name)
      LocalStorage.setItem('nb-docs:versions', JSON.stringify(mappedVersions))
      setVersions(mappedVersions)
      setLoading(false)
      return data
    } catch (err) {
      return false
    }
  }

  if (error) {
    return <Detail markdown={`# Error: ${error.message}`} />
  }

  return (
    <List navigationTitle="Select Documentation Version" isLoading={loading}>
      <List.Section title="Versions">
        {versions.map((version, index) => (
          <List.Item
            key={index}
            title={version}
            icon="../assets/nativebase-logo.png"
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Open Docs for ${version}`}
                  target={<Docs version={version} />}
                  icon="../assets/nativebase-logo.png"
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}
