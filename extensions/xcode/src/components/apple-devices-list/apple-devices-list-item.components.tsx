import { List } from "@raycast/api";
import { AppleDevice } from "../../models/apple-device/apple-device.model";

export function AppleDevicesListItem(props: { device: AppleDevice; revalidate: () => void }): JSX.Element {
  return (
    <List.Item
      title={props.device.name}
      subtitle={props.device.codeName}
      keywords={[
        props.device.name,
        props.device.codeName,
        props.device.type,
        props.device.codeName.toLowerCase().replaceAll(props.device.type.toLowerCase(), ""),
        props.device.codeName.toLowerCase().replaceAll(props.device.type.toLowerCase(), "").replaceAll(",", "."),
        props.device.codeName.toLowerCase().replaceAll(props.device.type.toLowerCase(), "").replaceAll(",", ""),
      ]}
    />
  );
}
