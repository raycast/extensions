import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { DomainAction } from './DomainAction'
import { DomainDetail } from './DomainDetail'
import { useAllDomainsQuery } from './queries'
import { getDomainStatusIcon } from './status'

export const AllDomains = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: domains = [], isLoading } = useAllDomainsQuery({
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
          key={domain.domain}
          title={domain.domain}
          icon={{
            source: {
              dark: 'icons/domains@dark.svg',
              light: 'icons/domains@light.svg',
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
