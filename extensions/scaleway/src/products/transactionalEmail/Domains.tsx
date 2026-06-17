import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { DomainAction } from './DomainAction'
import { DomainDetail } from './DomainDetail'
import { useAllRegionsDomainsQuery } from './queries'
import { getDomainStatusIcon } from './status'

export const Domains = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: domains = [], isLoading } = useAllRegionsDomainsQuery({
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !domains

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Domains …"
    >
      {domains.map((domain) => (
        <List.Item
          key={domain.id}
          title={domain.name}
          icon={{
            source: {
              dark: 'icons/transactional-email@dark.svg',
              light: 'icons/transactional-email@light.svg',
            },
          }}
          detail={<DomainDetail domain={domain} />}
          accessories={[
            {
              tooltip: domain.status,
              icon: getDomainStatusIcon(domain),
            },
          ]}
          actions={<DomainAction domain={domain} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Domains found" />
    </List>
  )
}
