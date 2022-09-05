import {
  List,
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
} from '@raycast/api'
import tinyRelativeDate from 'tiny-relative-date'
import { CopyInstallCommandActions } from './CopyInstallCommandActions'
import { parseRepoUrl } from './utils/parseRepoUrl'
import { Readme } from './Readme'
import { NpmObject } from './npmResponse.model'

interface PackageListItemProps {
  result: NpmObject
  searchTerm: string
}

const scoreToPercentage = (score: number): string => {
  return `${Math.round(score * 100)}%`
}

interface Preferences {
  defaultOpenAction: 'openRepository' | 'openHomepage' | 'npmPackagePage'
}

export const PackageListItem = ({
  result,
  searchTerm,
}: PackageListItemProps): JSX.Element => {
  const { defaultOpenAction }: Preferences = getPreferenceValues()
  const pkg = result.package
  const { owner, name, type } = parseRepoUrl(pkg.links.repository)

  const openActions = {
    openRepository: pkg.links?.repository ? (
      <Action.OpenInBrowser
        key="openRepository"
        url={pkg.links.repository}
        title="Open Repository"
      />
    ) : null,
    openHomepage:
      pkg.links?.homepage && pkg.links.homepage !== pkg.links?.repository ? (
        <Action.OpenInBrowser
          key="openHomepage"
          url={pkg.links.homepage}
          title="Open Homepage"
          icon={Icon.Link}
        />
      ) : null,
    npmPackagePage: (
      <Action.OpenInBrowser
        key="npmPackagePage"
        url={pkg.links.npm}
        title="npm Package Page"
        icon={{
          source: 'command-icon.png',
        }}
      />
    ),
    skypackPackagePage: (
      <Action.OpenInBrowser
        url={`https://www.skypack.dev/view/${pkg.name}`}
        title="Skypack Package Page"
        key="skypackPackagePage"
      />
    ),
  }

  return (
    <List.Item
      id={pkg.name}
      key={pkg.name}
      title={pkg.name}
      subtitle={pkg.description}
      icon={Icon.ArrowRight}
      accessories={[
        {
          text: `v${pkg.version}`,
          tooltip: `Latest version`,
        },
        {
          icon: Icon.Calendar,
          tooltip: `Last updated: ${tinyRelativeDate(new Date(pkg.date))}`,
        },
        {
          icon: Icon.MemoryChip,
          tooltip: `Score: ${scoreToPercentage(result.score.final)}`,
        },
      ]}
      keywords={pkg.keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            {Object.entries(openActions)
              .sort(([a]) => {
                if (a === defaultOpenAction) {
                  return -1
                } else {
                  return 0
                }
              })
              .map(([key, action]) => {
                if (!action) {
                  return null
                }
                return action
              })
              .filter(Boolean)}
            <Action.OpenInBrowser
              url={`https://npms.io/search?q=${searchTerm}`}
              title="npms.io Search Results"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            {type === 'github' && owner && name ? (
              <Action.Push
                title="View readme"
                target={<Readme user={owner} repo={name} />}
                icon={Icon.BlankDocument}
              />
            ) : null}
            <Action.OpenInBrowser
              url={`https://bundlephobia.com/package/${pkg.name}`}
              title="Open Bundlephobia"
              icon={Icon.LevelMeter}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'enter' }}
            />
            {pkg.links?.repository && type === 'github' ? (
              <Action.OpenInBrowser
                url={pkg.links.repository.replace('github.com', 'github.dev')}
                title="View Code in Github.dev"
                icon={{
                  source: {
                    light: 'github-bright.png',
                    dark: 'github-dark.png',
                  },
                }}
                shortcut={{ modifiers: ['cmd'], key: '.' }}
              />
            ) : null}
            {type === 'github' || (type === 'gitlab' && owner && name) ? (
              <Action.OpenInBrowser
                url={`https://codesandbox.io/s/${
                  type === 'github' ? 'github' : 'gitlab'
                }/${owner}/${name}`}
                title="View in CodeSandbox"
                icon={{
                  source: {
                    light: 'codesandbox-bright.png',
                    dark: 'codesandbox-dark.png',
                  },
                }}
              />
            ) : null}
            <Action.OpenInBrowser
              url={`https://snyk.io/vuln/npm:${pkg.name}`}
              title="Open Snyk Vulnerability Check"
              icon={{
                source: {
                  light: 'snyk-bright.png',
                  dark: 'snyk-dark.png',
                },
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyInstallCommandActions packageName={pkg.name} />
            <Action.CopyToClipboard
              title="Copy Package Name"
              content={pkg.name}
            />
            <Action.CopyToClipboard
              title="Copy Package URL"
              content={pkg.links.npm}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}
