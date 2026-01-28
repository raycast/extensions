import { Color, Detail, Icon } from "@raycast/api";
import { SuccessResponseMetadata } from "../types";

type MetadataDetailComponentProps = {
  metadata: SuccessResponseMetadata;
};
export default function MetadataDetailComponent({ metadata }: MetadataDetailComponentProps) {
  return (
    <>
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="METADATA" text="---" />
      <Detail.Metadata.Label title="Status" text={metadata.status} />
      <Detail.Metadata.Label
        title="Status Message"
        text={metadata.statusmsg}
        icon={metadata.statusmsg ? undefined : Icon.Minus}
      />
      <Detail.Metadata.Label title="Hostname" text={metadata.hostname} />
      <Detail.Metadata.Label title="IP Address" text={metadata.ipaddress} />
      <Detail.Metadata.TagList title="VM Status">
        <Detail.Metadata.TagList.Item
          text={metadata.vmstat}
          color={metadata.vmstat === "online" ? Color.Green : Color.Red}
        />
      </Detail.Metadata.TagList>
    </>
  );
}
