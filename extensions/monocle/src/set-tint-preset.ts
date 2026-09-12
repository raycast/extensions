import { LaunchProps } from "@raycast/api";
import { monocle } from "./monocle";

export default async function main(props: LaunchProps<{ arguments: Arguments.SetTintPreset }>) {
  const preset = props.arguments.preset;
  const label = preset.charAt(0).toUpperCase() + preset.slice(1);
  await monocle(`tint/color/${preset}`, `Tint: ${label}`);
}
