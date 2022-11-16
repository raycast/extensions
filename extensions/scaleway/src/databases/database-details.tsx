import { Icon, List } from '@raycast/api'
import { Database } from '../scaleway/types'
import { bytesToSize, getCountryImage, getDatabaseStatusIcon } from '../utils'

export default function DatabaseDetails(database: Database) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={getDatabaseStatusIcon(database.status).tooltip}
              color={getDatabaseStatusIcon(database.status).value.tintColor}
            />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="ID" text={database.id} />
          <List.Item.Detail.Metadata.Label title="Name" text={database.name} />
          <List.Item.Detail.Metadata.Label title="Engine" text={database.engine} />
          <List.Item.Detail.Metadata.Label
            title="Region"
            text={database.region}
            icon={getCountryImage(database.region)}
          />
          {database.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {database.tags.map((tag, i) => (
                <List.Item.Detail.Metadata.TagList.Item key={i} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Type"
            icon={Icon.ComputerChip}
            text={database.node_type.toUpperCase()}
          />
          <List.Item.Detail.Metadata.Label
            title="Volume"
            text={`${bytesToSize(database.volume.size)} (${
              database.volume.type === 'lssd' ? 'Local' : 'Block'
            } storage)`}
          />
          <List.Item.Detail.Metadata.Label
            title="High availability"
            text={database.is_ha_cluster ? 'Yes' : 'No'}
          />
          <List.Item.Detail.Metadata.Label
            title="Read replicas"
            text={database.read_replicas.length.toString()}
          />

          {database.endpoints.map((endpoint, i) => (
            <List.Item.Detail.Metadata.Label
              key={i}
              title="Endpoint"
              text={`${endpoint.ip}:${endpoint.port}`}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
