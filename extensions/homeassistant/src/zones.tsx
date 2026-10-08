import { ZonesList } from "@components/zone/list";
import { LaunchProps } from "@raycast/api";

export default function ZonesCommand(props: LaunchProps) {
  return <ZonesList initialSearchText={props.fallbackText} />;
}
