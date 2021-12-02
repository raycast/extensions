import {
  getLocalStorageItem,
  getPreferenceValues,
  List,
  setLocalStorageItem,
  showToast,
  ToastStyle,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import fetch from 'node-fetch'
import { Response } from './response.model'
import { PackageListItem } from './PackagListItem'

interface State {
  items?: Response
  error?: Error
}

interface ExtensionPreferences {
  githubUsername: string
  resultsCount: string
}

export default function PackageList() {
  const [state, setState] = useState<State>({
    items: [],
  })
  const [loading, setLoading] = useState<boolean>(true)
  const { githubUsername, resultsCount }: ExtensionPreferences =
    getPreferenceValues()

  useEffect(() => {
    const fetchPackages = async (): Promise<void> => {
      const storedItems = await getLocalStorageItem<string>('github-star-items')

      if (storedItems) {
        setState({ items: JSON.parse(storedItems) as Response })
      }

      try {
        const response = await fetch(
          `https://api.github.com/users/${githubUsername}/starred?per_page=${resultsCount}`
        )
        const json = await response.json()
        if (response.ok) {
          setState({ items: json as Response })
          await setLocalStorageItem('github-star-items', JSON.stringify(json))
        } else {
          await setLocalStorageItem('github-star-items', '')
          setState({
            error: new Error(
              'This GitHub user does not exist. Check your preferences'
            ),
          })
        }
        setLoading(false)
      } catch (error) {
        showToast(ToastStyle.Failure, 'Could not fetch stars')
        setState({
          error:
            error instanceof Error ? error : new Error('Something went wrong'),
        })
      }
    }

    if (githubUsername) {
      fetchPackages()
    } else {
      setState({
        error: new Error(
          `Please add your GitHub username to this extension's preferences`
        ),
      })
    }
  }, [])

  if (state?.error) {
    showToast(ToastStyle.Failure, 'Failed loading stars', state.error.message)
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter…">
      {state?.items?.length
        ? state.items.map((item) => {
            return <PackageListItem key={item.id} result={item} />
          })
        : null}
    </List>
  )
}
