import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer, useState } from 'react'
import { POLLING_INTERVAL } from '../../constants'
import { ImageAction, ImageDetail } from './pages/images'
import { NamespaceDropdown } from './pages/namespaces'
import { useAllImagesQuery, useAllRegionNamespacesQuery } from './queries'
import { isImageTransient, isNamespaceTransient } from './status'

export const Images = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string>('')

  const { data: namespaces = [], isLoading: isLoadingNamespaces } = useAllRegionNamespacesQuery(
    {
      orderBy: 'created_at_desc',
      organizationId: clientSetting.defaultOrganizationId,
    },
    {
      needPolling: (n) => (n || []).some(isNamespaceTransient),
    }
  )

  const { data: images, isLoading: isLoadingImages } = useAllImagesQuery(
    {
      namespaceId: selectedNamespaceId,
      organizationId: clientSetting.defaultOrganizationId,
      region: namespaces.find(({ id }) => id === selectedNamespaceId)?.region,
    },
    {
      enabled: selectedNamespaceId !== '',
      pollingInterval: POLLING_INTERVAL['10S'],
      needPolling: (image) => (image || []).some(isImageTransient),
    }
  )

  const isLoading = isLoadingImages || isLoadingNamespaces

  const isListLoading = isLoading && !images

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Images …"
      searchBarAccessory={
        <NamespaceDropdown
          setSelectedNamespaceId={setSelectedNamespaceId}
          namespaces={namespaces}
        />
      }
    >
      {(images || []).map((image) => (
        <List.Item
          key={image.id}
          title={image.name}
          icon={{
            source: {
              dark: 'icons/registry@dark.svg',
              light: 'icons/registry@light.svg',
            },
          }}
          detail={<ImageDetail image={image} namespaces={namespaces} />}
          actions={
            <ImageAction
              image={image}
              namespaces={namespaces}
              toggleIsDetailOpen={toggleIsDetailOpen}
            />
          }
        />
      ))}

      <List.EmptyView title="No Images found" />
    </List>
  )
}
