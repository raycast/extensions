import { Action, ActionPanel } from '@raycast/api'
import type { Registryv1 } from '@scaleway/sdk'
import { getImageUrl } from '../../urls'

type ImageActionProps = {
  namespaces: Registryv1.Namespace[]
  image: Registryv1.Image
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
