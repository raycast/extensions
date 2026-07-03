import { LaunchProps } from "@raycast/api";
import { normalizeDomain } from "./api";
import { SurfaceDetail } from "./surface-detail";

interface Arguments {
  domain: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const domain = normalizeDomain(props.arguments.domain);
  return <SurfaceDetail domain={domain} />;
}
