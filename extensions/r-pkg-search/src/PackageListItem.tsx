import { List, Icon, ActionPanel } from '@raycast/api'
import { PackageActions } from './PackageActions'
import { RpkgResultModel } from './RpkgResponse.model'

interface PackageListItemProps {
  result: RpkgResultModel
}

export const PackageListItem = ({
  result,
}: PackageListItemProps): JSX.Element => {
  const pkg = result.package

  return (
    <List.Item
      id={pkg.name}
      key={pkg.name}
      title={pkg.name}
      subtitle={pkg.title}
      icon={Icon.ArrowRight}
      accessories={[{ text: `v${pkg.version}` }]}
      actions={
        <ActionPanel>
          <PackageActions.Panel pkg={pkg} linkToDescription={true} />
        </ActionPanel>
      }
    />
  )
}
