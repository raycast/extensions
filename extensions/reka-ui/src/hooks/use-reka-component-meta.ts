import { useCachedPromise } from "@raycast/utils"

import { REKA_COMPONENTS_GITHUB_URL } from "../constants"
import { getGithubFetchErrorMessage, getGithubHeaders, getGithubPat } from "../github-api"
import { parseComponentMetaFromGhJson } from "../utils"
import { Component } from "./use-reka-components"

export interface ComponentMeta extends Component {
  description: string
  anatomy: string
  features: string[]
}

export function useRekaComponentMeta(component: Component) {
  const ghPat = getGithubPat()

  const {
    data: componentMeta,
    isLoading,
    error,
  } = useCachedPromise(
    async (slug: string, pat: string) => {
      const res = await fetch(`${REKA_COMPONENTS_GITHUB_URL}/${slug}`, {
        headers: getGithubHeaders(pat),
      })

      if (!res.ok) {
        throw new Error(getGithubFetchErrorMessage(res.status, res.statusText))
      }

      const json = await res.json()
      const meta = parseComponentMetaFromGhJson(json)

      return {
        ...component,
        ...meta,
      }
    },
    [component.slug, ghPat],
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
