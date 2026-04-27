import { useFetch } from '@raycast/utils'
import { useMemo } from 'react'

import { REKA_COMPONENTS_GITHUB_URL } from '../constants'
import { getComponentUrlFromFilename, parseComponentNameFromFilename } from '../utils'

export interface Component {
  name: string
  docsUrl: string
  slug: string
}

export function useRekaComponents() {
  const { data } = useFetch<{ name: string }[]>(REKA_COMPONENTS_GITHUB_URL)

  const components = useMemo<Component[] | undefined>(() => {
    if (data)
      return data.map((c) => ({
        docsUrl: getComponentUrlFromFilename(c.name),
        name: parseComponentNameFromFilename(c.name),
        slug: c.name,
      }))
  }, [data])

  return { components }
}
