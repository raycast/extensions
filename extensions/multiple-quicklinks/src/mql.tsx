import { LaunchProps } from "@raycast/api";
import { Mql1 } from "./mql1";

export default function Command(props: LaunchProps) {
  return <Mql1 launchContext={props.launchContext as { variantId?: string } | undefined} />;
}
