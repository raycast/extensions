import { LaunchProps } from "@raycast/api";
import { run, viaRemo } from "./roku";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Play }>,
) {
  const { title, app } = props.arguments;
  const q = app ? `?on=${encodeURIComponent(app)}` : "";
  await run(
    `Playing ${title}${app ? ` on ${app}` : ""}`,
    () => viaRemo(`play/${encodeURIComponent(title)}${q}`),
    "Couldn’t open Remo",
  );
}
