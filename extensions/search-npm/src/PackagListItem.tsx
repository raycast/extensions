import {
  List,
  Icon,
  ActionPanel,
  OpenInBrowserAction,
  PushAction,
  CopyToClipboardAction,
} from '@raycast/api'
import { CopyInstallCommandActions } from './CopyInstallCommandActions'
import { parseRepoUrl } from './utils/parseRepoUrl'
import { Readme } from './Readme'
import { NpmsResultModel } from './npmsResponse.model'

interface PackageListItemProps {
  result: NpmsResultModel
}

export const PackageListItem = ({
  result,
}: PackageListItemProps): JSX.Element => {
  const pkg = result.package
  const { owner, name, type } = parseRepoUrl(pkg.links.repository)

  return (
    <List.Item
      id={pkg.name}
      key={pkg.name}
      title={pkg.name}
      subtitle={pkg.description}
      icon={Icon.ArrowRight}
      accessoryTitle={`v${pkg.version}`}
      keywords={pkg.keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            {pkg.links?.repository ? (
              <OpenInBrowserAction
                url={pkg.links.repository}
                title="Open Repository"
              />
            ) : null}
            {pkg.links?.homepage &&
            pkg.links.homepage !== pkg.links?.repository ? (
              <OpenInBrowserAction
                url={pkg.links.homepage}
                title="Open Homepage"
                icon={Icon.Link}
              />
            ) : null}
            <OpenInBrowserAction
              url={pkg.links.npm}
              title="npm Package Page"
              icon={{
                source: 'command-icon.png',
              }}
            />
            <OpenInBrowserAction
              url={`https://npms.io/search?q=${pkg.name}`}
              title="npms.io Search Results"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            {type === 'github' && owner && name ? (
              <PushAction
                title="View readme"
                target={<Readme user={owner} repo={name} />}
                icon={Icon.TextDocument}
              />
            ) : null}
            <OpenInBrowserAction
              url={`https://bundlephobia.com/package/${pkg.name}`}
              title="Open Bundlephobia"
              icon={Icon.LevelMeter}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'enter' }}
            />
            {pkg.links?.repository && type === 'github' ? (
              <OpenInBrowserAction
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
              <OpenInBrowserAction
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
            <OpenInBrowserAction
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
            <CopyInstallCommandActions name={pkg.name} />
            <CopyToClipboardAction
              title="Copy Package Name"
              content={pkg.name}
              shortcut={{ modifiers: ['cmd'], key: 'c' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}
