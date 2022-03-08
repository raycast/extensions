import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  List,
  showToast,
  Toast
} from '@raycast/api'
import fetch from 'node-fetch'
import React, { useEffect } from 'react'
import { Docs } from './components'
import { ContentResponse } from './types'

const showNoTokenToast = async () => {
  await showToast({
    title: 'Enter your GitHub PAT',
    message: 'To avoid rate limiting, you must enter your GitHub PAT',
    style: Toast.Style.Success
  })
}

export default function main() {
  const headers: RequestInit['headers'] = {}
  const { gh_pat: token } = getPreferenceValues()
  const [versions, setVersions] = React.useState<string[]>([])
  const [error, setError] = React.useState<Error | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)

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
          headers
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

  if (!token) {
    showNoTokenToast()
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
