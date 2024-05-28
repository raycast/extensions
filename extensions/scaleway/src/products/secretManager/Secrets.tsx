import { List } from '@raycast/api'
import { useReducer } from 'react'
import { getPreferenceUser } from '../../helpers/getPreferenceUser'
import { SecretsAction } from './SecretAction'
import { SecretDetail } from './SecretDetail'
import { useAllZoneSecretsQuery } from './queries'

export const Secrets = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: secrets = [], isLoading } = useAllZoneSecretsQuery({
    orderBy: 'created_at_desc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !secrets

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Servers …"
    >
      {secrets.map((secret) => (
        <List.Item
          key={secret.id}
          title={secret.name}
          icon={{
            source: {
              dark: 'icons/secret@dark.svg',
              light: 'icons/secret@light.svg',
            },
          }}
          detail={<SecretDetail secret={secret} />}
          actions={<SecretsAction secret={secret} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Servers found" />
    </List>
  )
}
