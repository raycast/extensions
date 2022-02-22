import { Action, ActionPanel, getPreferenceValues, List } from '@raycast/api'
import fetch from 'node-fetch'
import React, { useEffect } from 'react'
import { Docs } from './components'
import { ContentResponse } from './types'

export default function main() {
  const headers: RequestInit['headers'] = {}
  const { gh_pat: token } = getPreferenceValues()
  const [versions, setVersions] = React.useState<string[]>([])

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  useEffect(() => {
    getVersions()
  }, [])

  const getVersions = async () => {
    try {
      const res = await fetch(
        'https://api.github.com/repos/GeekyAnts/nativebase-docs/contents/docs',
        {
          method: 'GET',
          headers,
        }
      )
      const data = (await res.json()) as Array<ContentResponse>
      setVersions(data?.map((d) => d?.name))
      return data
    } catch (error) {
      return false
    }
  }

  return (
    <List
      navigationTitle="Select documentation version"
      isLoading={!versions.length}
    >
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
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}
