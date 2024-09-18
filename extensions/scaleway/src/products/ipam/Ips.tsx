import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { IpDetail } from './IpDetail'
import { useAllRegionsIpsQuery } from './queries'

export const Ips = () => {
  const clientSetting = getPreferenceUser()

  const { data: ips = [], isLoading } = useAllRegionsIpsQuery({
    orderBy: 'created_at_asc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !ips

  return (
    <List isLoading={isListLoading} isShowingDetail searchBarPlaceholder="Search Ips …">
      {ips.map((ip) => (
        <List.Item
          key={ip.id}
          title={ip.address}
          icon={{
            source: {
              dark: 'icons/ipam@dark.svg',
              light: 'icons/ipam@light.svg',
            },
          }}
          detail={<IpDetail ip={ip} />}
        />
      ))}

      <List.EmptyView title="No Ips found" />
    </List>
  )
}
