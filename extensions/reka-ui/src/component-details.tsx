import { getPreferenceValues, List } from "@raycast/api"
import { useMemo } from "react"

import { useRekaComponentMeta } from "./hooks/use-reka-component-meta"
import { Component } from "./hooks/use-reka-components"
import { isRateLimitError } from "./github-api"

function buildComponentMarkdown(
  prefs: Preferences,
  componentMeta: ReturnType<typeof useRekaComponentMeta>["componentMeta"],
  featuresMd: string,
): string {
  const sections: string[] = []

  if (prefs.description) {
    sections.push(`### Description\n${componentMeta?.description ?? "..."}`)
  }

  if (prefs.features) {
    sections.push(`### Features\n${featuresMd}`)
  }

  if (prefs.anatomy) {
    sections.push(`### Anatomy\n\`\`\`html\n${componentMeta?.anatomy ?? "..."}\n\`\`\``)
  }

  return sections.join("\n\n")
}

export function ComponentDetails({ component }: { component: Component }) {
  const { componentMeta, isLoading, error } = useRekaComponentMeta(component)
  const prefs = getPreferenceValues<Preferences>()

  const featuresMd = useMemo(() => {
    if (!componentMeta?.features) return "..."

    return componentMeta.features.map((f) => `- ${f}`).join("\n")
  }, [componentMeta])

  const markdown = useMemo(() => {
    if (componentMeta) {
      const content = buildComponentMarkdown(prefs, componentMeta, featuresMd)

      if (error) {
        const staleNotice = isRateLimitError(error)
          ? "*Showing cached data. GitHub rate limit exceeded — add a PAT in extension preferences or try again later.*"
          : `*Showing cached data. ${error.message}*`

        return `${content}\n\n---\n\n${staleNotice}`
      }

      return content
    }

    if (error) {
      return `### Couldn't Load Metadata\n\n${error.message}`
    }

    return buildComponentMarkdown(prefs, componentMeta, featuresMd)
  }, [componentMeta, error, featuresMd, prefs])

  return <List.Item.Detail isLoading={isLoading} markdown={markdown} />
}
