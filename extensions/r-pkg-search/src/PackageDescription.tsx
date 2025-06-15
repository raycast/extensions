import { Action, ActionPanel, Detail, useNavigation } from '@raycast/api'
import { PackageActions } from './PackageActions'
import { Package } from './RpkgResponse.model'

interface PackageDescriptionProps {
  pkg: Package
}

const descMarkdown = (pkg: Package): string => {
  return `&nbsp;![v${pkg.version}](https://img.shields.io/badge/CRAN-v${
    pkg.version
  }-skyblue.png?style=flat-square) ![Updated ${new Date(
    pkg.date,
  ).toLocaleDateString()}](https://img.shields.io/badge/Updated-${new Date(
    pkg.date,
  ).toLocaleDateString()}-skyblue.png?style=flat-square) ![${
    pkg.downloads
  } downloads](https://img.shields.io/badge/Downloads-${pkg.downloads.toLocaleString()}-blue.png?style=flat-square) ![Dependencies: ${(
    pkg.depends.length + pkg.imports.length
  ).toLocaleString()}](https://img.shields.io/badge/deps-${(
    pkg.depends.length + pkg.imports.length
  ).toLocaleString()}-orange.png?style=flat-square) ![Reverse dependencies: ${pkg.revdeps.toLocaleString()}](https://img.shields.io/badge/revdeps-${pkg.revdeps.toLocaleString()}-red.png?style=flat-square)

# ${pkg.name}
## ${pkg.title.replaceAll('\n', ' ')}

${pkg.description}

## Dependencies

${pkg.depends.length ? `**Depends:** ${pkg.depends.join(', ')}` : ''}

${pkg.imports.length ? `**Imports:** ${pkg.imports.join(', ')}` : ''}

${pkg.suggests.length ? `**Suggests:** ${pkg.suggests.join(', ')}` : ''}

${
  pkg.systemRequirements.length
    ? `**System Requirements:** ${pkg.systemRequirements}`
    : ''
}

## Authors

- ${pkg.authors.join('\n- ')}
`
}

export const PackageDescription = ({
  pkg,
}: PackageDescriptionProps): JSX.Element => {
  const { pop: navReturn } = useNavigation()

  return (
    <Detail
      markdown={descMarkdown(pkg)}
      navigationTitle={`rpkg > ${pkg.name}`}
      actions={
        <ActionPanel>
          <PackageActions.Panel pkg={pkg} linkToDescription={false} />
          <Action
            title="Back to package search results"
            onAction={navReturn}
            shortcut={{ modifiers: [], key: 'arrowLeft' }}
          />
        </ActionPanel>
      }
    />
  )
}
