import { CameraGrid } from "@components/camera/grid";
import { LaunchProps } from "@raycast/api";

export default function main(props: LaunchProps) {
  return <CameraGrid initialSearchText={props.fallbackText} />;
}
