import {
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
  Keyboard,
} from '@raycast/api'
import { PackageDescription } from './PackageDescription'
import { Package } from './RpkgResponse.model'
import { Fragment } from 'react'

interface Preferences {
  defaultOpenAction:
    | 'openRpkg'
    | 'openCRAN'
    | 'openURL'
    | 'openBugs'
    | 'openRepo'
  defaultCopyAction: 'base' | 'alt'
  defaultAlternateInstall: 'pak' | 'remotes' | 'devtools' | 'pacman'
}

interface PackageCopyProps {
  pkg: Package
}

const PackageInstallActions = ({ pkg }: PackageCopyProps): JSX.Element => {
  const {
    defaultCopyAction,
    defaultAlternateInstall,
  }: Preferences = getPreferenceValues()
  const { name } = pkg

  const defaultShortcut: Keyboard.Shortcut = {
    key: 'c',
    modifiers: ['shift', 'cmd'],
  }
  const alternateShortcut: Keyboard.Shortcut = {
    key: 'c',
    modifiers: ['opt', 'cmd'],
  }

  const commandAltCran = {
    pak: 'pak::pak',
    remotes: 'remotes::install_cran',
    devtools: 'devtools::install_cran',
    pacman: 'pacman::p_install',
  }

  const commandAltGithub = {
    pak: 'pak::pak',
    remotes: 'remotes::install_github',
    devtools: 'devtools::install_github',
    pacman: 'pacman::p_install_gh',
  }

  const commands = {
    base: `install.packages("${name}")`,
    alt: `${commandAltCran[defaultAlternateInstall]}("${name}")`,
    dev:
      pkg.repo?.type === 'github'
        ? `${commandAltGithub[defaultAlternateInstall]}("${pkg.repo.owner}/${pkg.repo.name}")`
        : null,
  }

  const baseAction = (
    <Action.CopyToClipboard
      title={`Copy ${commands.base}`}
      content={commands.base}
      shortcut={
        defaultCopyAction === 'base' ? defaultShortcut : alternateShortcut
      }
    />
  )

  const pakAction = (
    <Action.CopyToClipboard
      title={`Copy ${commands.alt}`}
      content={commands.alt}
      shortcut={
        defaultCopyAction === 'alt' ? defaultShortcut : alternateShortcut
      }
    />
  )

  const devPakAction = commands.dev ? (
    <Action.CopyToClipboard
      title={`Copy ${commands.dev}`}
      content={commands.dev}
    />
  ) : null

  return (
    <>
      {defaultCopyAction === 'alt' ? (
        <>
          {baseAction}
          {pakAction}
          {devPakAction}
        </>
      ) : (
        <>
          {pakAction}
          {baseAction}
          {devPakAction}
        </>
      )}
    </>
  )
}

const PackageCopyActions = ({ pkg }: PackageCopyProps) => {
  const cran = `https://cran.r-project.org/package=${pkg.name}`
  const home = pkg.links?.url ? pkg.links.url[0] : undefined
  const repo = pkg.links?.repo ? pkg.links.repo : undefined
  const hasHomeLink = home && home !== cran && home !== repo

  const copyActions = []

  if (hasHomeLink) {
    copyActions.push(
      <Action.CopyToClipboard
        key="copyHome"
        content={home}
        title="Copy Home URL"
        shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
      />,
    )
  }

  copyActions.push(
    <Action.CopyToClipboard
      key="copyCRAN"
      content={cran}
      title="Copy CRAN URL"
      shortcut={{ modifiers: ['cmd', 'shift'], key: '.' }}
    />,
  )

  if (repo) {
    copyActions.push(
      <Action.CopyToClipboard
        key="copyRepo"
        content={repo}
        title="Copy Repo URL"
        shortcut={
          !hasHomeLink ? { modifiers: ['cmd', 'shift'], key: ',' } : undefined
        }
      />,
    )
  }

  return <>{copyActions}</>
}

interface PackageActionsPanelProps {
  pkg: Package
  linkToDescription: boolean
}

const PackageActionsPanel = ({
  pkg,
  linkToDescription,
}: PackageActionsPanelProps): JSX.Element => {
  let { defaultOpenAction }: Preferences = getPreferenceValues()

  if (
    defaultOpenAction === 'openURL' &&
    !(pkg.links.url && pkg.links.url.length)
  ) {
    defaultOpenAction = 'openCRAN'
  }
  const actions = {
    openRpkg: (
      <Action.OpenInBrowser
        key="openRpkg"
        url={`https://r-pkg.org/pkg/${pkg.name}`}
        title="Open on r-pkg.org"
      />
    ),
    openCRAN: (
      <Action.OpenInBrowser
        key="openCRAN"
        url={`https://cran.r-project.org/package=${pkg.name}`}
        title="Open on CRAN"
        icon={Icon.Cloud}
      />
    ),
    openURL: pkg.links?.url ? (
      <Action.OpenInBrowser
        key="openURL"
        url={pkg.links.url[0]}
        title="Open Homepage"
        icon={Icon.House}
      />
    ) : null,
    openRepo: pkg.links?.repo ? (
      <Action.OpenInBrowser
        key="openRepo"
        url={pkg.links.repo}
        title="Open Repo"
        icon={Icon.Box}
      />
    ) : null,
    openCRANchecks: (
      <Action.OpenInBrowser
        key="openCRANchecks"
        url={`https://cran.rstudio.com/web/checks/check_results_${pkg.name}.html`}
        title="Open CRAN Check Results"
        icon={Icon.Heartbeat}
      />
    ),
    openBugs: pkg.links?.bugs ? (
      <Action.OpenInBrowser
        key="openBugs"
        url={pkg.links.bugs}
        title="Open Bugs"
        icon={Icon.Bug}
      />
    ) : null,
  }

  return (
    <Fragment>
      <ActionPanel.Section title="Links">
        {Object.entries(actions)
          .sort(([a], [b]) => {
            if (a === defaultOpenAction) {
              return -1
            }
            if (b === defaultOpenAction) {
              return 1
            }
            return 0
          })
          .map(x => x[1])}
        <Action.OpenInBrowser
          url={`https://r-pkg.org/search.html?q=${pkg.name}`}
          title="r-pkg.org Search Results"
          icon={Icon.MagnifyingGlass}
        />
      </ActionPanel.Section>
      {linkToDescription && (
        <ActionPanel.Section>
          <Action.Push
            title="Description"
            target={<PackageDescription pkg={pkg} />}
            shortcut={{ modifiers: [], key: 'arrowRight' }}
            icon={Icon.BlankDocument}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Copy">
        <PackageCopyActions pkg={pkg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Install">
        <PackageInstallActions pkg={pkg} />
      </ActionPanel.Section>
    </Fragment>
  )
}

export const PackageActions = {
  Panel: PackageActionsPanel,
  Copy: PackageCopyActions,
  Install: PackageCopyActions,
}
