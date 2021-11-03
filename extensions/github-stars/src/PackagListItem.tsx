import {
  List,
  Icon,
  ActionPanel,
  OpenInBrowserAction,
  PushAction,
  CopyToClipboardAction,
  ImageMask,
} from '@raycast/api'
import { Readme } from './Readme'
import { Star } from './response.model'

interface PackageListItemProps {
  result: Star
}

export const PackageListItem = ({
  result,
}: PackageListItemProps): JSX.Element => {
  const descriptionAsArray = result?.description
    ? result.description.split(' ')
    : []
  const keywords = [result.name, ...descriptionAsArray]
  return (
    <List.Item
      id={result.node_id}
      title={result.full_name}
      subtitle={result.description}
      icon={{
        source: result.owner.avatar_url,
        mask: ImageMask.Circle,
      }}
      accessoryTitle={`★ ${result.stargazers_count}`}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={result.html_url} title="Open Repository" />
          <PushAction
            title="View readme"
            target={<Readme user={result.owner.login} repo={result.name} />}
            icon={Icon.TextDocument}
          />
        </ActionPanel>
      }
      keywords={keywords}
    />
  )
}
