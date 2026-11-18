import { type LaunchProps, showHUD } from "@raycast/api";
import { runSpacetile } from "./spacetile";

export default async function Command({ arguments: { command } }: LaunchProps<{ arguments: Arguments.RunCommand }>) {
  const trimmed = command.trim();
  if (!trimmed) return;
  if (await runSpacetile(trimmed)) await showHUD(`Spacetile: ${trimmed}`);
}
