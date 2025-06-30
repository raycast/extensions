import { List } from "@raycast/api";
import { AppleDevice } from "../../models/apple-device/apple-device.model";

export function AppleDevicesListItem(props: { device: AppleDevice; revalidate: () => void }) {
  return (
    <List.Item
      title={props.device.name}
      subtitle={props.device.identifier}
      keywords={[
        props.device.name,
        props.device.identifier,
        props.device.type,
        props.device.identifier.toLowerCase().replaceAll(props.device.type.toLowerCase(), ""),
        props.device.identifier.toLowerCase().replaceAll(props.device.type.toLowerCase(), "").replaceAll(",", "."),
        props.device.identifier.toLowerCase().replaceAll(props.device.type.toLowerCase(), "").replaceAll(",", ""),
      ]}
    />
  );
}
