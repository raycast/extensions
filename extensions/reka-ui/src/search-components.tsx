import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api"
import { useEffect, useMemo, useState } from "react"

import { ComponentDetails } from "./component-details"
import { useRekaComponents } from "./hooks/use-reka-components"
import { isRateLimitError } from "./github-api"

export default function Command() {
  const { components, isLoading, error } = useRekaComponents()
  const prefs = getPreferenceValues<Preferences>()
  const [selectedSlug, setSelectedSlug] = useState<string>()

  const shouldShowMetaPanel = useMemo(() => prefs.anatomy || prefs.description || prefs.features, [prefs])

  const selectedComponent = useMemo(
    () => components?.find((component) => component.slug === selectedSlug),
    [components, selectedSlug],
  )

  useEffect(() => {
    if (!components?.length) return

    const selectionStillExists = selectedSlug && components.some((component) => component.slug === selectedSlug)
    if (!selectionStillExists) {
      setSelectedSlug(components[0].slug)
    }
  }, [components, selectedSlug])

  return (
    <List
      searchBarPlaceholder="Search components..."
      isShowingDetail={shouldShowMetaPanel}
      isLoading={isLoading}
      selectedItemId={selectedSlug}
      onSelectionChange={(id) => setSelectedSlug(id ?? undefined)}
    >
      <List.EmptyView
        title={error && !components?.length ? "Couldn't Load Components" : "No Results"}
        description={
          error && !components?.length
            ? isRateLimitError(error)
              ? "GitHub rate limit exceeded. Add a PAT in extension preferences or try again later."
              : error.message
            : "Try searching for a different component name."
        }
        icon={error && !components?.length ? Icon.ExclamationMark : Icon.MagnifyingGlass}
      />
      {components?.map((component) => (
        <List.Item
          id={component.slug}
          key={component.slug}
          title={component.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={component.docsUrl} />
              <Action.CopyToClipboard content={component.docsUrl} />
            </ActionPanel>
          }
          detail={
            shouldShowMetaPanel && selectedComponent?.slug === component.slug ? (
              <ComponentDetails component={selectedComponent} />
            ) : undefined
          }
        />
      ))}
    </List>
  )
}
