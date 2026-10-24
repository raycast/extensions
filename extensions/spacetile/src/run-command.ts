import { type LaunchProps, showHUD } from "@raycast/api";
import { runSpacetile } from "./spacetile";

export default async function Command({ arguments: { command } }: LaunchProps<{ arguments: Arguments.RunCommand }>) {
  if (await runSpacetile(command.trim())) await showHUD(`Spacetile: ${command.trim()}`);
}
