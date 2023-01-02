import { Icon, List } from '@raycast/api'
import { RDB } from '@scaleway/sdk'
import { getDatabaseStatusIcon } from '../helpers/databases'
import { bytesToSize, getCountryImage } from '../helpers'

export default function DatabaseDetail(database: RDB.v1.Instance) {
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
            text={database.nodeType.toUpperCase()}
          />
          <List.Item.Detail.Metadata.Label
            title="Volume"
            text={`${bytesToSize(database.volume?.size)} (${
              database.volume?.type === 'lssd'
                ? 'Local'
                : database.volume?.type === 'bssd'
                ? 'Block'
                : 'Unknown'
            } storage)`}
          />
          <List.Item.Detail.Metadata.Label
            title="High availability"
            text={database.isHaCluster ? 'Yes' : 'No'}
          />
          <List.Item.Detail.Metadata.Label
            title="Read replicas"
            text={database.readReplicas.length.toString()}
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
