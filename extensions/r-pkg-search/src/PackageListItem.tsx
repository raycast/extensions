import {
  List,
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
} from '@raycast/api'
import { PackageActions } from './PackageActions'
import { RpkgResultModel } from './RpkgResponse.model'

interface PackageListItemProps {
  result: RpkgResultModel
}

interface Preferences {
  defaultOpenAction:
    | 'openRpkg'
    | 'openCRAN'
    | 'openURL'
    | 'openBugs'
    | 'openRepo'
}

export const PackageListItem = ({
  result,
}: PackageListItemProps): JSX.Element => {
  let { defaultOpenAction }: Preferences = getPreferenceValues()
  const pkg = result.package
  // const { owner, name, type } = parseRepoUrl(pkg.links.repository)

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
        url={`https://cran.rstudio.com/package=${pkg.name}`}
        title="Open on CRAN"
        icon={Icon.Link}
      />
    ),
    openURL: pkg.links?.url ? (
      <Action.OpenInBrowser
        key="openURL"
        url={pkg.links.url[0]}
        title="Open Homepage"
        icon={Icon.Link}
      />
    ) : null,
    openRepo: pkg.links?.repo ? (
      <Action.OpenInBrowser
        key="openRepo"
        url={pkg.links.repo}
        title="Open Repo"
        icon={Icon.Link}
      />
    ) : null,
    openBugs: pkg.links?.bugs ? (
      <Action.OpenInBrowser
        key="openBugs"
        url={pkg.links.bugs}
        title="Open Bugs"
        icon={Icon.Link}
      />
    ) : null,
  }

  return (
    <List.Item
      id={pkg.name}
      key={pkg.name}
      title={pkg.name}
      subtitle={pkg.title}
      icon={Icon.ArrowRight}
      accessories={[{ text: `v${pkg.version}` }]}
      actions={<PackageActions.Panel pkg={pkg} linkToDescription={true} />}
    />
  )
}
