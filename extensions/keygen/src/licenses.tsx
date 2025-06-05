import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { useKeygen } from "./keygen";
import { License } from "./interfaces";
import { ActionPanel, Icon, List } from "@raycast/api";
import OpenInKeygen from "./open-in-keygen";
dayjs.extend(relatimeTime);

export default function Licenses() {
  const { isLoading, data: licenses = [] } = useKeygen<License[]>("licenses");

  return <List isLoading={isLoading} isShowingDetail>
    {licenses.map(license => <List.Item key={license.id} icon={Icon.Dot} title={license.id.slice(0, 8)} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Resource" />
      <List.Item.Detail.Metadata.Label title="ID" text={license.id} />
      <List.Item.Detail.Metadata.Label title="Created" text={dayjs(license.attributes.created).fromNow()} />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Attributes" />
      <List.Item.Detail.Metadata.Label title="Name" text={license.attributes.name || "--"} />
      <List.Item.Detail.Metadata.Label title="Key" text={license.attributes.key} />
      {/* exopr */}
      <List.Item.Detail.Metadata.TagList title="Status">
        <List.Item.Detail.Metadata.TagList.Item text={license.attributes.status} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Machines" text={`${license.relationships.machines.meta.count} of ${license.attributes.maxMachines ?? "unlimited"}`} />
      <List.Item.Detail.Metadata.Label title="CPU Cores" text={`${license.relationships.machines.meta.cores} of ${license.attributes.maxCores ?? "unlimited"}`} />
      <List.Item.Detail.Metadata.Label title="Users" text={`${license.relationships.users.meta.count} of ${license.attributes.maxUsers ?? "unlimited"}`} />
      <List.Item.Detail.Metadata.TagList title="Protected">
        <List.Item.Detail.Metadata.TagList.Item text={`${license.attributes.protected}`} />
      </List.Item.Detail.Metadata.TagList>
      {/* scheme */}
      <List.Item.Detail.Metadata.TagList title="Suspended">
        <List.Item.Detail.Metadata.TagList.Item text={`${license.attributes.suspended}`} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Last Validation" text={license.attributes.lastValidated?.toString() || "--"} />
      {/* vlid */}
      <List.Item.Detail.Metadata.Label title="Last Check-Out" text={license.attributes.lastCheckOut?.toString() || "--"} />
      <List.Item.Detail.Metadata.Label title="Last Check-In" text={license.attributes.lastCheckIn?.toString() || "--"} />
      <List.Item.Detail.Metadata.Label title="Next Check-In" text={license.attributes.nextCheckIn?.toString() || "--"} />
      <List.Item.Detail.Metadata.TagList title="Permissions">
        {license.attributes.permissions.map(permission => <List.Item.Detail.Metadata.TagList.Item key={permission} text={permission} />)}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Relationships" />
    </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
      <OpenInKeygen route={`licenses/${license.id}`} />
    </ActionPanel>} />)}
  </List>
}
