import { LaunchProps, showHUD } from "@raycast/api";
import { monocle, parsePercent } from "./monocle";

export default async function main(props: LaunchProps<{ arguments: Arguments.SetTintOpacity }>) {
  const pct = parsePercent(props.arguments.level);
  if (pct === null) {
    await showHUD("Enter a number 0–100");
    return;
  }
  await monocle(`tint/opacity/${pct}`, `Tint opacity ${pct}%`);
}
