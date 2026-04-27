import { getPreferenceValues, List } from '@raycast/api'
import { useMemo } from 'react'

import { useRekaComponentMeta } from './hooks/use-reka-component-meta'
import { Component } from './hooks/use-reka-components'

export function ComponentDetails({ component }: { component: Component }) {
  const { componentMeta, isLoading } = useRekaComponentMeta(component)
  const prefs = getPreferenceValues<Preferences>()

  const featuresMd = useMemo(() => {
    if (!componentMeta?.features) return '...'

    return componentMeta.features.map((f) => `- ${f}`).join('\n')
  }, [componentMeta])

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={`
${
  prefs.description
    ? `
### Description
${componentMeta?.description ?? '...'}`
    : ''
}

${
  prefs.features
    ? `
### Features
${featuresMd}`
    : ''
}

${
  prefs.anatomy
    ? `
### Anatomy
\`\`\`html
${componentMeta?.anatomy ?? '...'}
\`\`\``
    : ''
}
`}
    />
  )
}
