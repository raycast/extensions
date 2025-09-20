import { List } from '@raycast/api'
import type { IPAM } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'

type IPProps = {
  ip: IPAM.v1.IP
}

export const IpDetail = ({ ip }: IPProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="ID" text={ip.id} />

        <List.Item.Detail.Metadata.Label
          title="Region"
          text={ip.region}
          icon={{ source: getIconFromLocality(ip.region) }}
        />

        {ip.zone ? (
          <List.Item.Detail.Metadata.Label
            title="Zone"
            text={ip.zone}
            icon={{ source: getIconFromLocality(ip.zone) }}
          />
        ) : null}

        {ip.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {ip.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}
        {ip.reverses.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Reverses">
            {ip.reverses.map((reverse) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={reverse.hostname}
                text={`${reverse.hostname}:${reverse.address}`}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        {/* <List.Item.Detail.Metadata.Label
          title="Subnets"
          text={ ip.resource subnets.map(({ subnet }) => subnet).toString()}
        /> */}

        {ip.resource ? (
          <>
            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="Name" text={ip.resource.name || '-'} />
            <List.Item.Detail.Metadata.Label title="Type" text={ip.resource.type} />
            <List.Item.Detail.Metadata.Label
              title="Mac Address"
              text={ip.resource.macAddress || '-'}
            />
          </>
        ) : null}
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Created At" text={ip.createdAt?.toDateString()} />
        <List.Item.Detail.Metadata.Label title="Created At" text={ip.updatedAt?.toDateString()} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={ip.projectId} />
      </List.Item.Detail.Metadata>
    }
  />
)
