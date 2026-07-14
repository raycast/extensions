import { LaunchProps } from "@raycast/api";
import { normalizeDomain } from "./api";
import { SurfaceDetail } from "./surface-detail";

export default function Command(props: LaunchProps<{ arguments: Arguments.InspectDomain }>) {
  const domain = normalizeDomain(props.arguments.domain);
  return <SurfaceDetail domain={domain} />;
}
