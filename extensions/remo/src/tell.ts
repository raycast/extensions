import { LaunchProps, showHUD } from "@raycast/api";
import { viaRemo } from "./roku";

export default async function Command(
  props: LaunchProps<{ arguments: { request: string } }>,
) {
  await viaRemo(`ask/${encodeURIComponent(props.arguments.request)}`);
  await showHUD("Sent to Remo");
}
