import { StatesList } from "@components/state/list";
import { LaunchProps } from "@raycast/api";

export default function main(props: LaunchProps) {
  return <StatesList domain="light" initialSearchText={props.fallbackText} />;
}
