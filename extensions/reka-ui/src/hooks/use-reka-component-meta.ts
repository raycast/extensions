import { getPreferenceValues } from '@raycast/api'
import { showFailureToast, useCachedPromise, useLocalStorage } from '@raycast/utils'
import { useEffect, useMemo } from 'react'

import { REKA_COMPONENTS_GITHUB_URL } from '../constants'
import { parseComponentMetaFromGhJson } from '../utils'
import { Component } from './use-reka-components'

export interface ComponentMeta extends Component {
  description: string
  anatomy: string
  features: string[]
}

export function useRekaComponentMeta(component: Component) {
  const {
    setValue: setCachedComponentMeta,
    value: cachedComponentMeta,
    isLoading: isLocalStorageLoading,
  } = useLocalStorage<ComponentMeta>(`reka-ui-component-meta:${component.slug}`)
  const prefs = getPreferenceValues<Preferences>()
  const ghPat = prefs.ghPat ?? ''

  const { isLoading: isPromiseLoading, revalidate } = useCachedPromise(
    async (slug: string, pat: string) => {
      if (cachedComponentMeta) return cachedComponentMeta

      const res = await fetch(`${REKA_COMPONENTS_GITHUB_URL}/${slug}`, {
        headers: {
          ...(pat ? { Authorization: `Bearer ${pat}` } : {}),
          'X-GitHub-Api-Version': '2026-03-10',
        },
        cache: 'force-cache',
      })
      if (!res.ok) {
        await showFailureToast(res.statusText, {
          message: res.statusText,
          title: 'Failed to fetch component metadata',
        })
        return
      }

      const json = await res.json()

      const meta = parseComponentMetaFromGhJson(json)

      await setCachedComponentMeta({
        ...component,
        ...meta,
      })
    },
    [component.slug, ghPat],
    {
      execute: false,
    },
  )

  useEffect(() => {
    if (!isLocalStorageLoading) revalidate()
  }, [isLocalStorageLoading, revalidate])

  const isLoading = useMemo(() => isPromiseLoading || isLocalStorageLoading, [isPromiseLoading, isLocalStorageLoading])

  return {
    componentMeta: cachedComponentMeta,
    isLoading,
  }
}
