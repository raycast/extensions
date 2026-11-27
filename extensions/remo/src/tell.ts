import { LaunchProps } from "@raycast/api";
import { run, viaRemo } from "./roku";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Tell }>,
) {
  await run(
    "Sent to Remo",
    () => viaRemo(`ask/${encodeURIComponent(props.arguments.request)}`),
    "Couldn’t open Remo",
  );
}
