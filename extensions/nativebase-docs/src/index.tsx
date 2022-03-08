import { Action, ActionPanel, Detail, List } from '@raycast/api'
import fetch from 'node-fetch'
import React, { useEffect } from 'react'
import { Docs } from './components'
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
      const res = await fetch(
        'https://api.github.com/repos/GeekyAnts/nativebase-docs/contents/docs',
        {
          method: 'GET',
          headers: {
            // CACHE THE CALL FOR 1 Hour
            'Cache-Control': 'max-age=3600'
          }
        }
      )

      if (res.status !== 200) {
        const err = (await res.json()) as Error
        setError(err)
        setLoading(false)
        return
      }

      const data = (await res.json()) as Array<ContentResponse>
      data.reverse()
      setVersions(data?.map((d) => d?.name))
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
