import { Action, ActionPanel } from '@raycast/api'
import type { Registry } from '@scaleway/sdk'
import { getImageUrl } from '../../urls'

type ImageActionProps = {
  namespaces: Registry.v1.Namespace[]
  image: Registry.v1.Image
  toggleIsDetailOpen: () => void
}

export const ImageAction = ({ namespaces, image, toggleIsDetailOpen }: ImageActionProps) => {
  const namespace = namespaces.find(({ id }) => id === image.namespaceId)

  return (
    <ActionPanel>
      <Action title="More Information" onAction={toggleIsDetailOpen} />
      {namespace ? (
        <>
          <Action.OpenInBrowser url={getImageUrl({ namespace, image })} />
          <Action.CopyToClipboard content={getImageUrl({ namespace, image })} />
        </>
      ) : null}
    </ActionPanel>
  )
}
