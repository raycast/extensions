import { useCachedPromise } from "@raycast/utils"

import { REKA_COMPONENTS_RAW_BASE_URL } from "../constants"
import { parseComponentMetaFromMarkdown } from "../utils"
import { Component } from "./use-reka-components"

export interface ComponentMeta extends Component {
  description: string
  anatomy: string
  features: string[]
}

export function useRekaComponentMeta(component: Component) {
  const {
    data: componentMeta,
    isLoading,
    error,
  } = useCachedPromise(
    async (slug: string) => {
      const res = await fetch(`${REKA_COMPONENTS_RAW_BASE_URL}/${slug}`)

      if (!res.ok) {
        throw new Error(res.statusText || `Request failed (${res.status})`)
      }

      const markdown = await res.text()
      const meta = parseComponentMetaFromMarkdown(markdown)

      return {
        ...component,
        ...meta,
      }
    },
    [component.slug],
    {
      keepPreviousData: true,
      onError(error) {
        console.error(`Failed to refresh metadata for ${component.slug}:`, error)
      },
    },
  )

  return {
    componentMeta,
    isLoading,
    error,
  }
}
